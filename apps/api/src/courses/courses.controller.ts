import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChapterDto, CourseDto, LessonDto, UpdateChapterDto, UpdateCourseDto, UpdateLessonDto } from './dto';
import { CoursesService } from './courses.service';

type UploadedFilePayload = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

@UseGuards(JwtAuthGuard)
@Controller()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('courses')
  list(@Req() req: { user: { sub: string } }) {
    return this.coursesService.listCourses(req.user.sub);
  }

  @Get('courses/:id')
  detail(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.coursesService.getCourse(req.user.sub, id);
  }

  @Get('lessons/:id')
  lesson(@Req() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.coursesService.getLessonPlayback(req.user.sub, id);
  }

  @UseGuards(AdminGuard)
  @Get('admin/courses')
  adminList() {
    return this.coursesService.adminListCourses();
  }

  @UseGuards(AdminGuard)
  @Post('admin/courses')
  adminCreateCourse(@Body() dto: CourseDto) {
    return this.coursesService.adminCreateCourse(dto);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/courses/:id')
  adminUpdateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.adminUpdateCourse(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/courses/:id')
  adminDeleteCourse(@Param('id') id: string) {
    return this.coursesService.adminDeleteCourse(id);
  }

  @UseGuards(AdminGuard)
  @Post('admin/courses/:id/chapters')
  adminCreateChapter(@Param('id') id: string, @Body() dto: ChapterDto) {
    return this.coursesService.adminCreateChapter(id, dto);
  }

  @UseGuards(AdminGuard)
  @Post('admin/courses/:id/lessons')
  adminCreateCourseLesson(@Param('id') id: string, @Body() dto: LessonDto) {
    return this.coursesService.adminCreateCourseLesson(id, dto);
  }

  @UseGuards(AdminGuard)
  @Post('admin/course-assets')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 30 * 1024 * 1024 } }))
  adminUploadCourseAsset(@UploadedFile() file?: UploadedFilePayload) {
    if (!file) throw new BadRequestException('请选择要上传的文件');
    return this.coursesService.adminUploadCourseAsset(file);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/chapters/:id')
  adminUpdateChapter(@Param('id') id: string, @Body() dto: UpdateChapterDto) {
    return this.coursesService.adminUpdateChapter(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/chapters/:id')
  adminDeleteChapter(@Param('id') id: string) {
    return this.coursesService.adminDeleteChapter(id);
  }

  @UseGuards(AdminGuard)
  @Post('admin/chapters/:id/lessons')
  adminCreateLesson(@Param('id') id: string, @Body() dto: LessonDto) {
    return this.coursesService.adminCreateLesson(id, dto);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/lessons/:id')
  adminUpdateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.coursesService.adminUpdateLesson(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/lessons/:id')
  adminDeleteLesson(@Param('id') id: string) {
    return this.coursesService.adminDeleteLesson(id);
  }
}
