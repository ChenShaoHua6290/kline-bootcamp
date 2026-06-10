import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac, randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getUploadRoot } from '../common/uploads';
import { PrismaService } from '../common/prisma.service';
import { ChapterDto, CourseDto, LessonDto } from './dto';

type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type CourseAccessLevel = 'PREVIEW' | 'TRAINING' | 'FULL' | 'INTERNAL';
type LessonType = 'VIDEO' | 'ARTICLE' | 'PDF' | 'MIXED';
type UserLearningTier = 'trial' | 'paid_training' | 'paid_full' | 'internal' | 'admin';
type UploadedCourseAsset = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

const PUBLISHED = 'PUBLISHED';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private db() {
    return this.prisma as any;
  }

  async listCourses(userId: string) {
    const tier = await this.getUserLearningTier(userId);
    const rows = await this.db().course.findMany({
      where: { status: PUBLISHED as never },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        chapters: {
          where: { status: PUBLISHED as never },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: {
              where: { status: PUBLISHED as never },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
    return {
      userTier: tier,
      learningPath: this.learningPath(),
      courses: rows.map((course: any) => this.toCourseListItem(course, tier)),
    };
  }

  async getCourse(userId: string, courseId: string) {
    const tier = await this.getUserLearningTier(userId);
    const course = await this.db().course.findFirst({
      where: { id: courseId, status: PUBLISHED as never },
      include: {
        chapters: {
          where: { status: PUBLISHED as never },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: {
              where: { status: PUBLISHED as never },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('课程不存在');
    return {
      ...this.toCourseListItem(course, tier),
      description: course.description,
    };
  }

  async getLessonPlayback(userId: string, lessonId: string) {
    const tier = await this.getUserLearningTier(userId);
    const lesson = await this.db().lesson.findFirst({
      where: { id: lessonId, status: PUBLISHED as never },
      include: {
        chapter: {
          include: {
            course: true,
            lessons: {
              where: { status: PUBLISHED as never },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: { id: true, title: true, sortOrder: true },
            },
          },
        },
      },
    });
    if (!lesson || lesson.chapter.status !== PUBLISHED || lesson.chapter.course.status !== PUBLISHED) {
      throw new NotFoundException('课时不存在');
    }
    const lessonAccess = this.canAccess(tier, lesson.accessLevel as CourseAccessLevel, lesson.isPreview);
    if (!lessonAccess) {
      throw new ForbiddenException(this.lockReason(tier, lesson.accessLevel as CourseAccessLevel));
    }

    const siblingIds = lesson.chapter.lessons.map((row: { id: string }) => row.id);
    const index = siblingIds.indexOf(lesson.id);
    const prevLessonId = index > 0 ? siblingIds[index - 1] : null;
    const nextLessonId = index >= 0 && index < siblingIds.length - 1 ? siblingIds[index + 1] : null;

    const videoAppId = process.env.TENCENT_VOD_APP_ID || process.env.VOD_APP_ID || null;
    const videoPsign = videoAppId && lesson.videoFileId ? this.createVodPlayerSignature(videoAppId, lesson.videoFileId) : null;

    return {
      id: lesson.id,
      chapterId: lesson.chapterId,
      courseId: lesson.chapter.courseId,
      courseTitle: lesson.chapter.course.title,
      chapterTitle: lesson.chapter.title,
      title: lesson.title,
      type: lesson.type,
      content: lesson.content,
      videoProvider: lesson.videoProvider,
      videoFileId: lesson.videoFileId,
      videoUrl: lesson.videoUrl,
      videoAppId,
      videoPsign,
      videoLicenseUrl: process.env.TENCENT_VOD_LICENSE_URL || null,
      attachmentUrl: lesson.attachmentUrl,
      duration: lesson.duration,
      isPreview: lesson.isPreview,
      accessLevel: lesson.accessLevel,
      prevLessonId,
      nextLessonId,
    };
  }

  async adminListCourses() {
    return this.db().course.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        chapters: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            lessons: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
        },
      },
    });
  }

  async adminCreateCourse(dto: CourseDto) {
    return this.db().course.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle || null,
        description: dto.description || null,
        coverImage: dto.coverImage || null,
        sortOrder: dto.sortOrder ?? 0,
        status: (dto.status ?? 'DRAFT') as never,
        chapters: {
          create: {
            title: '默认课时组',
            description: null,
            sortOrder: 0,
            status: 'PUBLISHED' as never,
          },
        },
      },
    });
  }

  async adminUpdateCourse(id: string, dto: Partial<CourseDto>) {
    await this.ensureCourse(id);
    return this.db().course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status as never } : {}),
      },
    });
  }

  async adminDeleteCourse(id: string) {
    const course = await this.db().course.findUnique({
      where: { id },
      include: {
        chapters: {
          include: {
            lessons: { select: { id: true } },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('课程不存在');
    const chapterCount = course.chapters.length;
    const lessonCount = course.chapters.reduce((sum: number, chapter: any) => sum + chapter.lessons.length, 0);
    await this.db().course.delete({ where: { id } });
    return { ok: true, deleted: { type: 'course', id, title: course.title, chapterCount, lessonCount } };
  }

  async adminCreateChapter(courseId: string, dto: ChapterDto) {
    await this.ensureCourse(courseId);
    return this.db().courseChapter.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description || null,
        sortOrder: dto.sortOrder ?? 0,
        status: (dto.status ?? 'DRAFT') as never,
      },
    });
  }

  async adminUpdateChapter(id: string, dto: Partial<ChapterDto>) {
    await this.ensureChapter(id);
    return this.db().courseChapter.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status as never } : {}),
      },
    });
  }

  async adminDeleteChapter(id: string) {
    const chapter = await this.db().courseChapter.findUnique({
      where: { id },
      include: { lessons: { select: { id: true } } },
    });
    if (!chapter) throw new NotFoundException('章节不存在');
    const lessonCount = chapter.lessons.length;
    await this.db().courseChapter.delete({ where: { id } });
    return { ok: true, deleted: { type: 'chapter', id, title: chapter.title, lessonCount } };
  }

  async adminCreateCourseLesson(courseId: string, dto: LessonDto) {
    const chapter = await this.ensureDefaultChapter(courseId);
    return this.db().lesson.create({ data: this.lessonData(chapter.id, dto) as any });
  }

  async adminCreateLesson(chapterId: string, dto: LessonDto) {
    await this.ensureChapter(chapterId);
    return this.db().lesson.create({ data: this.lessonData(chapterId, dto) as any });
  }

  async adminUpdateLesson(id: string, dto: Partial<LessonDto>) {
    const lesson = await this.ensureLesson(id);
    const chapterId = dto.chapterId ?? lesson.chapterId;
    if (dto.chapterId) await this.ensureChapter(dto.chapterId);
    return this.db().lesson.update({
      where: { id },
      data: this.lessonData(chapterId, dto, true) as any,
    });
  }

  async adminDeleteLesson(id: string) {
    const lesson = await this.ensureLesson(id);
    await this.db().lesson.delete({ where: { id } });
    return { ok: true, deleted: { type: 'lesson', id, title: lesson.title } };
  }

  async adminUploadCourseAsset(file: UploadedCourseAsset | undefined) {
    if (!file?.buffer || !file.mimetype) throw new BadRequestException('请选择要上传的文件');
    const allowed = new Map<string, { ext: string; kind: 'image' | 'pdf' }>([
      ['image/png', { ext: '.png', kind: 'image' }],
      ['image/jpeg', { ext: '.jpg', kind: 'image' }],
      ['image/webp', { ext: '.webp', kind: 'image' }],
      ['image/gif', { ext: '.gif', kind: 'image' }],
      ['application/pdf', { ext: '.pdf', kind: 'pdf' }],
    ]);
    const match = allowed.get(file.mimetype);
    if (!match) throw new BadRequestException('仅支持 PNG、JPG、WEBP、GIF 图片和 PDF 文件');
    const maxSize = match.kind === 'pdf' ? 30 * 1024 * 1024 : 8 * 1024 * 1024;
    const size = file.size ?? file.buffer.length;
    if (size > maxSize) throw new BadRequestException(match.kind === 'pdf' ? 'PDF 文件不能超过 30MB' : '图片文件不能超过 8MB');

    const relativeDir = join('course-assets', match.kind);
    const targetDir = join(getUploadRoot(), relativeDir);
    await mkdir(targetDir, { recursive: true });
    const fileName = `${Date.now()}-${randomBytes(8).toString('hex')}${match.ext}`;
    await writeFile(join(targetDir, fileName), file.buffer);
    return {
      url: `/uploads/${relativeDir.replace(/\\/g, '/')}/${fileName}`,
      kind: match.kind,
      mimeType: file.mimetype,
      originalName: file.originalname ?? fileName,
      size,
    };
  }

  async getUserLearningTier(userId: string): Promise<UserLearningTier> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        role: string | null;
        accessType: string | null;
        accessStatus: string | null;
        accessExpiresAt: Date | null;
        learningAccessLevel: string | null;
      }>
    >`
      SELECT role, "accessType", "accessStatus", "accessExpiresAt", "learningAccessLevel"
      FROM "User"
      WHERE id = ${userId}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) throw new NotFoundException('用户不存在');
    if ((user.role ?? 'USER') === 'ADMIN') return 'admin';
    if ((user.accessStatus ?? 'ACTIVE') === 'DISABLED') return 'trial';
    const accessType = (user.accessType ?? 'INTERNAL').toUpperCase();
    if (accessType === 'INTERNAL') return 'internal';
    if (accessType === 'TRIAL') return 'trial';
    if (accessType === 'PAID') {
      if (user.accessExpiresAt && user.accessExpiresAt.getTime() <= Date.now()) return 'trial';
      return (user.learningAccessLevel ?? 'TRAINING') === 'FULL' ? 'paid_full' : 'paid_training';
    }
    return 'trial';
  }

  private toCourseListItem(course: any, tier: UserLearningTier) {
    return {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      coverImage: course.coverImage,
      sortOrder: course.sortOrder,
      status: course.status,
      chapters: course.chapters.map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        sortOrder: chapter.sortOrder,
        status: chapter.status,
        lessons: chapter.lessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          duration: lesson.duration,
          isPreview: lesson.isPreview,
          accessLevel: lesson.accessLevel,
          sortOrder: lesson.sortOrder,
          locked: !this.canAccess(tier, lesson.accessLevel as CourseAccessLevel, lesson.isPreview),
          lockReason: this.canAccess(tier, lesson.accessLevel as CourseAccessLevel, lesson.isPreview)
            ? null
            : this.lockReason(tier, lesson.accessLevel as CourseAccessLevel),
        })),
      })),
    };
  }

  private canAccess(tier: UserLearningTier, level: CourseAccessLevel, isPreview: boolean) {
    if (tier === 'admin' || tier === 'internal') return true;
    if (isPreview || level === 'PREVIEW') return true;
    if (level === 'TRAINING') return tier === 'paid_training' || tier === 'paid_full';
    if (level === 'FULL') return tier === 'paid_full';
    if (level === 'INTERNAL') return false;
    return false;
  }

  private lockReason(tier: UserLearningTier, level: CourseAccessLevel) {
    if (tier === 'trial') return '试用用户只能查看试看课时。';
    if (tier === 'paid_training' && level === 'FULL') return '当前为训练系统权限，完整课程需开通完整体系权限。';
    if (level === 'INTERNAL') return '该内容仅内部用户或管理员可见。';
    return '当前权限不可查看该内容。';
  }

  private createVodPlayerSignature(appId: string, fileId: string) {
    const key = process.env.TENCENT_VOD_PLAYER_SIGN_KEY || process.env.VOD_PLAYER_SIGN_KEY;
    if (!key) return null;

    const numericAppId = Number(appId);
    if (!Number.isFinite(numericAppId)) return null;

    const currentTimeStamp = Math.floor(Date.now() / 1000);
    const expireTimeStamp = currentTimeStamp + Number(process.env.TENCENT_VOD_PLAYER_SIGN_EXPIRES_SECONDS ?? 7200);
    const urlExpireTimeStamp = currentTimeStamp + Number(process.env.TENCENT_VOD_URL_EXPIRES_SECONDS ?? 7200);
    const audioVideoType = process.env.TENCENT_VOD_PLAYER_AUDIO_VIDEO_TYPE || 'Original';
    const contentInfo: Record<string, string | number> = { audioVideoType };
    const rawAdaptiveDefinition = Number(process.env.TENCENT_VOD_RAW_ADAPTIVE_DEFINITION ?? 0);
    const transcodeDefinition = Number(process.env.TENCENT_VOD_TRANSCODE_DEFINITION ?? 0);
    const imageSpriteDefinition = Number(process.env.TENCENT_VOD_IMAGE_SPRITE_DEFINITION ?? 0);
    if (audioVideoType === 'RawAdaptive' && rawAdaptiveDefinition > 0) {
      contentInfo.rawAdaptiveDefinition = rawAdaptiveDefinition;
    }
    if (audioVideoType === 'Transcode' && transcodeDefinition > 0) {
      contentInfo.transcodeDefinition = transcodeDefinition;
    }
    if (imageSpriteDefinition > 0) {
      contentInfo.imageSpriteDefinition = imageSpriteDefinition;
    }

    const us = randomBytes(5).toString('hex');
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };
    const payload = {
      appId: numericAppId,
      fileId,
      contentInfo,
      currentTimeStamp,
      expireTimeStamp,
      random: randomBytes(8).toString('hex'),
      urlAccessInfo: this.vodUrlAccessInfo(urlExpireTimeStamp, us),
    };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.base64UrlEncode(createHmac('sha256', key).update(signingInput).digest());
    return `${signingInput}.${signature}`;
  }

  private base64UrlEncode(value: string | Buffer) {
    return Buffer.from(value)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private vodUrlAccessInfo(urlExpireTimeStamp: number, us: string) {
    const exper = Number(process.env.TENCENT_VOD_TRIAL_SECONDS ?? 0);
    const rlimit = Number(process.env.TENCENT_VOD_URL_RLIMIT ?? 3);
    const domain = process.env.TENCENT_VOD_PLAY_DOMAIN?.trim();
    const scheme = process.env.TENCENT_VOD_PLAY_SCHEME?.trim();
    const uv = process.env.TENCENT_VOD_TRACE_UV?.trim();
    return {
      t: urlExpireTimeStamp.toString(16),
      ...(exper >= 30 ? { exper } : {}),
      ...(rlimit > 0 ? { rlimit } : {}),
      us,
      ...(domain ? { domain } : {}),
      ...(scheme ? { scheme } : {}),
      ...(uv && /^[0-9a-fA-F]{6}$/.test(uv) ? { uv } : {}),
    };
  }

  private learningPath() {
    return [
      { key: 'learn', title: '学', description: '系统课件与视频课程建立规则认知' },
      { key: 'use', title: '用', description: '指标系统与多周期共振提醒辅助执行' },
      { key: 'practice', title: '练', description: 'K线训练系统还原盘中决策' },
      { key: 'review', title: '复盘', description: '历史记录与总结持续修正偏差' },
    ];
  }

  private async ensureDefaultCatalog() {
    const count = await this.db().course.count();
    if (count > 0) return;
    await this.prisma.$transaction(async (tx) => {
      const db = tx as any;
      await db.course.createMany({
        data: [
          {
            id: 'course_intro',
            title: '体系入门',
            subtitle: '先建立认知，再进入规则训练',
            description: '理解只做一种模式的学习边界、训练闭环和风险约束。',
            sortOrder: 10,
            status: 'PUBLISHED' as never,
          },
          {
            id: 'course_system_notes',
            title: '系统课件',
            subtitle: '固定模式的结构化规则库',
            description: '围绕市场结构、趋势判断、入场逻辑、风险控制和多周期分析建立规则框架。',
            sortOrder: 20,
            status: 'PUBLISHED' as never,
          },
          {
            id: 'course_video_teaching',
            title: '视频教学',
            subtitle: '从讲解到案例拆解',
            description: '通过模式讲解、实战案例、结构拆解和复盘思路，把规则落到具体场景。',
            sortOrder: 30,
            status: 'PUBLISHED' as never,
          },
          {
            id: 'course_indicators',
            title: '指标系统',
            subtitle: '指标只做执行辅助',
            description: '学习指标安装、指标逻辑和常见错误用法，避免把指标当预测工具。',
            sortOrder: 40,
            status: 'PUBLISHED' as never,
          },
          {
            id: 'course_alerts',
            title: '多周期共振提醒',
            subtitle: '提醒是观察辅助，不是喊单',
            description: '理解共振触发逻辑，以及如何与固定模式结合使用。',
            sortOrder: 50,
            status: 'PUBLISHED' as never,
          },
          {
            id: 'course_kline_training',
            title: 'K线训练系统',
            subtitle: '从练习到复盘闭环',
            description: '学习如何开始训练、开仓、部分平仓、全部平仓、查看历史和写复盘。',
            sortOrder: 60,
            status: 'PUBLISHED' as never,
          },
        ],
      });
      await db.courseChapter.createMany({
        data: [
          { id: 'chapter_intro_main', courseId: 'course_intro', title: '体系入门', description: '进入完整体系前需要先明确的学习原则。', sortOrder: 10, status: 'PUBLISHED' as never },
          { id: 'chapter_system_structure', courseId: 'course_system_notes', title: '系统课件', description: '固定交易模式的核心课件章节。', sortOrder: 10, status: 'PUBLISHED' as never },
          { id: 'chapter_video_cases', courseId: 'course_video_teaching', title: '视频教学', description: '围绕案例和结构展开的视频课程。', sortOrder: 10, status: 'PUBLISHED' as never },
          { id: 'chapter_indicator_usage', courseId: 'course_indicators', title: '指标系统', description: '指标安装、逻辑和注意事项。', sortOrder: 10, status: 'PUBLISHED' as never },
          { id: 'chapter_alerts_usage', courseId: 'course_alerts', title: '多周期共振提醒', description: '提醒逻辑和辅助执行方式。', sortOrder: 10, status: 'PUBLISHED' as never },
          { id: 'chapter_training_flow', courseId: 'course_kline_training', title: 'K线训练系统', description: '训练系统的操作与复盘流程。', sortOrder: 10, status: 'PUBLISHED' as never },
        ],
      });
      await db.lesson.createMany({
        data: this.defaultLessons().map((lesson) => ({
          ...lesson,
          type: lesson.type as never,
          accessLevel: lesson.accessLevel as never,
          status: 'PUBLISHED' as never,
        })),
      });
    });
  }

  private defaultLessons() {
    return [
      { id: 'lesson_intro_why_one_mode', chapterId: 'chapter_intro_main', title: '为什么只做一种模式', type: 'MIXED', content: '这一课用于说明为什么减少模式数量，反而更容易建立稳定执行。核心不是追求更多信号，而是让每一次交易都能被复盘、比较和修正。', duration: 600, isPreview: true, accessLevel: 'PREVIEW', sortOrder: 10 },
      { id: 'lesson_intro_learning_guide', chapterId: 'chapter_intro_main', title: '完整体系学习说明', type: 'ARTICLE', content: '建议按 学 → 用 → 练 → 复盘 的顺序推进：先学习规则，再理解指标和提醒的使用边界，然后进入K线训练，最后用历史记录和总结修正执行偏差。', duration: 480, isPreview: true, accessLevel: 'PREVIEW', sortOrder: 20 },
      { id: 'lesson_intro_risk_notice', chapterId: 'chapter_intro_main', title: '风险声明', type: 'ARTICLE', content: '本体系用于交易学习和训练，不提供喊单、带单或收益承诺。任何交易决策都需要自行判断并承担风险。', duration: 360, isPreview: true, accessLevel: 'PREVIEW', sortOrder: 30 },
      { id: 'lesson_system_market_structure', chapterId: 'chapter_system_structure', title: '市场结构', type: 'MIXED', content: '理解市场结构是固定模式的前提。后续可在后台补充课件PDF和视频讲解。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 10 },
      { id: 'lesson_system_trend', chapterId: 'chapter_system_structure', title: '趋势判断', type: 'MIXED', content: '围绕趋势延续、转折和无效结构建立判断规则。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 20 },
      { id: 'lesson_system_fixed_mode', chapterId: 'chapter_system_structure', title: '固定模式', type: 'MIXED', content: '明确只做一种模式的必要条件、过滤条件和执行边界。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 30 },
      { id: 'lesson_system_entry', chapterId: 'chapter_system_structure', title: '入场逻辑', type: 'MIXED', content: '定义入场触发、确认和无效场景，减少临盘随意性。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 40 },
      { id: 'lesson_system_risk', chapterId: 'chapter_system_structure', title: '风险控制', type: 'MIXED', content: '仓位、止损、止盈和回撤控制是训练的硬约束。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 50 },
      { id: 'lesson_system_multi_tf', chapterId: 'chapter_system_structure', title: '多周期分析', type: 'MIXED', content: '用多周期结构辅助观察，但不替代固定模式本身。', duration: 900, isPreview: false, accessLevel: 'FULL', sortOrder: 60 },
      { id: 'lesson_video_mode', chapterId: 'chapter_video_cases', title: '模式讲解', type: 'VIDEO', content: '绑定云点播或视频URL后可播放。', duration: 1200, isPreview: false, accessLevel: 'FULL', sortOrder: 10 },
      { id: 'lesson_video_cases', chapterId: 'chapter_video_cases', title: '实战案例', type: 'VIDEO', content: '用于承载历史行情中的典型案例讲解。', duration: 1200, isPreview: false, accessLevel: 'FULL', sortOrder: 20 },
      { id: 'lesson_video_structure', chapterId: 'chapter_video_cases', title: '结构拆解', type: 'VIDEO', content: '拆解结构位置、入场条件和风险边界。', duration: 1200, isPreview: false, accessLevel: 'FULL', sortOrder: 30 },
      { id: 'lesson_video_review', chapterId: 'chapter_video_cases', title: '复盘思路', type: 'VIDEO', content: '学习如何从操作过程而不是单次盈亏复盘。', duration: 1200, isPreview: false, accessLevel: 'FULL', sortOrder: 40 },
      { id: 'lesson_indicator_install', chapterId: 'chapter_indicator_usage', title: '指标安装', type: 'ARTICLE', content: '说明指标安装路径、配置方式和基础检查项。', duration: 600, isPreview: false, accessLevel: 'FULL', sortOrder: 10 },
      { id: 'lesson_indicator_logic', chapterId: 'chapter_indicator_usage', title: '指标逻辑', type: 'ARTICLE', content: '指标用于辅助识别结构与执行条件，不负责预测未来。', duration: 720, isPreview: false, accessLevel: 'FULL', sortOrder: 20 },
      { id: 'lesson_indicator_mistakes', chapterId: 'chapter_indicator_usage', title: '指标使用注意事项', type: 'ARTICLE', content: '避免把指标信号当成买卖点，避免脱离体系规则单独使用。', duration: 720, isPreview: false, accessLevel: 'FULL', sortOrder: 30 },
      { id: 'lesson_alerts_logic', chapterId: 'chapter_alerts_usage', title: '共振逻辑', type: 'ARTICLE', content: '多周期共振提醒用于提示值得观察的结构状态。', duration: 720, isPreview: false, accessLevel: 'FULL', sortOrder: 10 },
      { id: 'lesson_alerts_intro', chapterId: 'chapter_alerts_usage', title: '提醒说明', type: 'ARTICLE', content: '提醒不是喊单，不代表必须交易，只是帮助减少盯盘成本。', duration: 600, isPreview: false, accessLevel: 'FULL', sortOrder: 20 },
      { id: 'lesson_alerts_execution', chapterId: 'chapter_alerts_usage', title: '如何辅助执行', type: 'ARTICLE', content: '收到提醒后仍需回到固定模式的入场、止损和仓位规则。', duration: 720, isPreview: false, accessLevel: 'FULL', sortOrder: 30 },
      { id: 'lesson_training_start', chapterId: 'chapter_training_flow', title: '如何开始训练', type: 'ARTICLE', content: '选择市场、推进周期和训练数量，系统会随机抽取历史行情。', duration: 360, isPreview: true, accessLevel: 'TRAINING', sortOrder: 10 },
      { id: 'lesson_training_buy', chapterId: 'chapter_training_flow', title: '如何买入', type: 'ARTICLE', content: '根据固定模式执行开多或开空，并设置仓位与风险参数。', duration: 360, isPreview: true, accessLevel: 'TRAINING', sortOrder: 20 },
      { id: 'lesson_training_partial_close', chapterId: 'chapter_training_flow', title: '如何部分平仓', type: 'ARTICLE', content: '用部分平仓管理仓位暴露和执行节奏。', duration: 360, isPreview: true, accessLevel: 'TRAINING', sortOrder: 30 },
      { id: 'lesson_training_full_close', chapterId: 'chapter_training_flow', title: '如何全部平仓', type: 'ARTICLE', content: '全部平仓会记录本次交易结果并释放持仓。', duration: 360, isPreview: true, accessLevel: 'TRAINING', sortOrder: 40 },
      { id: 'lesson_training_history', chapterId: 'chapter_training_flow', title: '如何查看历史记录', type: 'ARTICLE', content: '历史记录用于查看每轮训练结果、交易动作和盈亏情况。', duration: 360, isPreview: true, accessLevel: 'TRAINING', sortOrder: 50 },
      { id: 'lesson_training_review', chapterId: 'chapter_training_flow', title: '如何复盘总结', type: 'ARTICLE', content: '训练结束后记录问题标签和总结，把错误动作转化为下一轮训练目标。', duration: 480, isPreview: true, accessLevel: 'TRAINING', sortOrder: 60 },
    ];
  }

  private async ensureCourse(id: string) {
    const row = await this.db().course.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('课程不存在');
    return row;
  }

  private async ensureChapter(id: string) {
    const row = await this.db().courseChapter.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('章节不存在');
    return row;
  }

  private async ensureDefaultChapter(courseId: string) {
    const course = await this.db().course.findUnique({
      where: { id: courseId },
      include: {
        chapters: {
          where: { status: 'PUBLISHED' as never },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
    });
    if (!course) throw new NotFoundException('课程不存在');
    if (course.chapters[0]) return course.chapters[0];
    return this.db().courseChapter.create({
      data: {
        courseId,
        title: '默认课时组',
        description: null,
        sortOrder: 0,
        status: 'PUBLISHED' as never,
      },
    });
  }

  private async ensureLesson(id: string) {
    const row = await this.db().lesson.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('课时不存在');
    return row;
  }

  private lessonData(chapterId: string, dto: Partial<LessonDto>, partial = false) {
    if (!partial && !dto.title) throw new BadRequestException('课时标题不能为空');
    if (!partial && !dto.type) throw new BadRequestException('课时类型不能为空');
    return {
      ...(dto.chapterId !== undefined || !partial ? { chapterId } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.type !== undefined ? { type: dto.type as LessonType as never } : {}),
      ...(dto.content !== undefined ? { content: dto.content || null } : {}),
      ...(dto.videoProvider !== undefined ? { videoProvider: dto.videoProvider || null } : {}),
      ...(dto.videoFileId !== undefined ? { videoFileId: dto.videoFileId || null } : {}),
      ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl || null } : {}),
      ...(dto.attachmentUrl !== undefined ? { attachmentUrl: dto.attachmentUrl || null } : {}),
      ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
      ...(dto.isPreview !== undefined ? { isPreview: dto.isPreview } : {}),
      ...(dto.accessLevel !== undefined ? { accessLevel: dto.accessLevel as never } : !partial ? { accessLevel: 'FULL' as never } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : !partial ? { sortOrder: 0 } : {}),
      ...(dto.status !== undefined ? { status: dto.status as CourseStatus as never } : !partial ? { status: 'DRAFT' as never } : {}),
    };
  }
}
