CREATE TYPE "LearningAccessLevel" AS ENUM ('TRAINING', 'FULL');
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "CourseAccessLevel" AS ENUM ('PREVIEW', 'TRAINING', 'FULL', 'INTERNAL');
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'ARTICLE', 'PDF', 'MIXED');

ALTER TABLE "User"
ADD COLUMN "learningAccessLevel" "LearningAccessLevel" NOT NULL DEFAULT 'TRAINING';

CREATE TABLE "courses" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT,
  "cover_image" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_chapters" (
  "id" TEXT NOT NULL,
  "course_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_chapters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
  "id" TEXT NOT NULL,
  "chapter_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "LessonType" NOT NULL,
  "content" TEXT,
  "video_provider" TEXT,
  "video_file_id" TEXT,
  "video_url" TEXT,
  "attachment_url" TEXT,
  "duration" INTEGER,
  "is_preview" BOOLEAN NOT NULL DEFAULT FALSE,
  "access_level" "CourseAccessLevel" NOT NULL DEFAULT 'FULL',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_lesson_progress" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "progress_seconds" INTEGER NOT NULL DEFAULT 0,
  "progress_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "is_completed" BOOLEAN NOT NULL DEFAULT FALSE,
  "last_watched_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "courses_status_sort_order_idx" ON "courses"("status", "sort_order");
CREATE INDEX "course_chapters_course_id_status_sort_order_idx" ON "course_chapters"("course_id", "status", "sort_order");
CREATE INDEX "lessons_chapter_id_status_sort_order_idx" ON "lessons"("chapter_id", "status", "sort_order");
CREATE UNIQUE INDEX "user_lesson_progress_user_id_lesson_id_key" ON "user_lesson_progress"("user_id", "lesson_id");
CREATE INDEX "user_lesson_progress_user_id_is_completed_idx" ON "user_lesson_progress"("user_id", "is_completed");
CREATE INDEX "user_lesson_progress_lesson_id_idx" ON "user_lesson_progress"("lesson_id");

ALTER TABLE "course_chapters"
ADD CONSTRAINT "course_chapters_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lessons"
ADD CONSTRAINT "lessons_chapter_id_fkey"
FOREIGN KEY ("chapter_id") REFERENCES "course_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_lesson_progress"
ADD CONSTRAINT "user_lesson_progress_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_lesson_progress"
ADD CONSTRAINT "user_lesson_progress_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "courses" ("id", "title", "subtitle", "description", "cover_image", "sort_order", "status", "created_at", "updated_at")
VALUES
  ('course_intro', '体系入门', '先建立认知，再进入规则训练', '理解只做一种模式的学习边界、训练闭环和风险约束。', NULL, 10, 'PUBLISHED', NOW(), NOW()),
  ('course_system_notes', '系统课件', '固定模式的结构化规则库', '围绕市场结构、趋势判断、入场逻辑、风险控制和多周期分析建立规则框架。', NULL, 20, 'PUBLISHED', NOW(), NOW()),
  ('course_video_teaching', '视频教学', '从讲解到案例拆解', '通过模式讲解、实战案例、结构拆解和复盘思路，把规则落到具体场景。', NULL, 30, 'PUBLISHED', NOW(), NOW()),
  ('course_indicators', '指标系统', '指标只做执行辅助', '学习指标安装、指标逻辑和常见错误用法，避免把指标当预测工具。', NULL, 40, 'PUBLISHED', NOW(), NOW()),
  ('course_alerts', '多周期共振提醒', '提醒是观察辅助，不是喊单', '理解共振触发逻辑，以及如何与固定模式结合使用。', NULL, 50, 'PUBLISHED', NOW(), NOW()),
  ('course_kline_training', 'K线训练系统', '从练习到复盘闭环', '学习如何开始训练、开仓、部分平仓、全部平仓、查看历史和写复盘。', NULL, 60, 'PUBLISHED', NOW(), NOW());

INSERT INTO "course_chapters" ("id", "course_id", "title", "description", "sort_order", "status", "created_at", "updated_at")
VALUES
  ('chapter_intro_main', 'course_intro', '体系入门', '进入完整体系前需要先明确的学习原则。', 10, 'PUBLISHED', NOW(), NOW()),
  ('chapter_system_structure', 'course_system_notes', '系统课件', '固定交易模式的核心课件章节。', 10, 'PUBLISHED', NOW(), NOW()),
  ('chapter_video_cases', 'course_video_teaching', '视频教学', '围绕案例和结构展开的视频课程。', 10, 'PUBLISHED', NOW(), NOW()),
  ('chapter_indicator_usage', 'course_indicators', '指标系统', '指标安装、逻辑和注意事项。', 10, 'PUBLISHED', NOW(), NOW()),
  ('chapter_alerts_usage', 'course_alerts', '多周期共振提醒', '提醒逻辑和辅助执行方式。', 10, 'PUBLISHED', NOW(), NOW()),
  ('chapter_training_flow', 'course_kline_training', 'K线训练系统', '训练系统的操作与复盘流程。', 10, 'PUBLISHED', NOW(), NOW());

INSERT INTO "lessons" ("id", "chapter_id", "title", "type", "content", "duration", "is_preview", "access_level", "sort_order", "status", "created_at", "updated_at")
VALUES
  ('lesson_intro_why_one_mode', 'chapter_intro_main', '为什么只做一种模式', 'MIXED', '这一课用于说明为什么减少模式数量，反而更容易建立稳定执行。核心不是追求更多信号，而是让每一次交易都能被复盘、比较和修正。', 600, TRUE, 'PREVIEW', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_intro_learning_guide', 'chapter_intro_main', '完整体系学习说明', 'ARTICLE', '建议按 学 → 用 → 练 → 复盘 的顺序推进：先学习规则，再理解指标和提醒的使用边界，然后进入K线训练，最后用历史记录和总结修正执行偏差。', 480, TRUE, 'PREVIEW', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_intro_risk_notice', 'chapter_intro_main', '风险声明', 'ARTICLE', '本体系用于交易学习和训练，不提供喊单、带单或收益承诺。任何交易决策都需要自行判断并承担风险。', 360, TRUE, 'PREVIEW', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_market_structure', 'chapter_system_structure', '市场结构', 'MIXED', '理解市场结构是固定模式的前提。后续可在后台补充课件PDF和视频讲解。', 900, FALSE, 'FULL', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_trend', 'chapter_system_structure', '趋势判断', 'MIXED', '围绕趋势延续、转折和无效结构建立判断规则。', 900, FALSE, 'FULL', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_fixed_mode', 'chapter_system_structure', '固定模式', 'MIXED', '明确只做一种模式的必要条件、过滤条件和执行边界。', 900, FALSE, 'FULL', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_entry', 'chapter_system_structure', '入场逻辑', 'MIXED', '定义入场触发、确认和无效场景，减少临盘随意性。', 900, FALSE, 'FULL', 40, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_risk', 'chapter_system_structure', '风险控制', 'MIXED', '仓位、止损、止盈和回撤控制是训练的硬约束。', 900, FALSE, 'FULL', 50, 'PUBLISHED', NOW(), NOW()),
  ('lesson_system_multi_tf', 'chapter_system_structure', '多周期分析', 'MIXED', '用多周期结构辅助观察，但不替代固定模式本身。', 900, FALSE, 'FULL', 60, 'PUBLISHED', NOW(), NOW()),
  ('lesson_video_mode', 'chapter_video_cases', '模式讲解', 'VIDEO', '绑定云点播或视频URL后可播放。', 1200, FALSE, 'FULL', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_video_cases', 'chapter_video_cases', '实战案例', 'VIDEO', '用于承载历史行情中的典型案例讲解。', 1200, FALSE, 'FULL', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_video_structure', 'chapter_video_cases', '结构拆解', 'VIDEO', '拆解结构位置、入场条件和风险边界。', 1200, FALSE, 'FULL', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_video_review', 'chapter_video_cases', '复盘思路', 'VIDEO', '学习如何从操作过程而不是单次盈亏复盘。', 1200, FALSE, 'FULL', 40, 'PUBLISHED', NOW(), NOW()),
  ('lesson_indicator_install', 'chapter_indicator_usage', '指标安装', 'ARTICLE', '说明指标安装路径、配置方式和基础检查项。', 600, FALSE, 'FULL', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_indicator_logic', 'chapter_indicator_usage', '指标逻辑', 'ARTICLE', '指标用于辅助识别结构与执行条件，不负责预测未来。', 720, FALSE, 'FULL', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_indicator_mistakes', 'chapter_indicator_usage', '指标使用注意事项', 'ARTICLE', '避免把指标信号当成买卖点，避免脱离体系规则单独使用。', 720, FALSE, 'FULL', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_alerts_logic', 'chapter_alerts_usage', '共振逻辑', 'ARTICLE', '多周期共振提醒用于提示值得观察的结构状态。', 720, FALSE, 'FULL', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_alerts_intro', 'chapter_alerts_usage', '提醒说明', 'ARTICLE', '提醒不是喊单，不代表必须交易，只是帮助减少盯盘成本。', 600, FALSE, 'FULL', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_alerts_execution', 'chapter_alerts_usage', '如何辅助执行', 'ARTICLE', '收到提醒后仍需回到固定模式的入场、止损和仓位规则。', 720, FALSE, 'FULL', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_start', 'chapter_training_flow', '如何开始训练', 'ARTICLE', '选择市场、推进周期和训练数量，系统会随机抽取历史行情。', 360, TRUE, 'TRAINING', 10, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_buy', 'chapter_training_flow', '如何买入', 'ARTICLE', '根据固定模式执行开多或开空，并设置仓位与风险参数。', 360, TRUE, 'TRAINING', 20, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_partial_close', 'chapter_training_flow', '如何部分平仓', 'ARTICLE', '用部分平仓管理仓位暴露和执行节奏。', 360, TRUE, 'TRAINING', 30, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_full_close', 'chapter_training_flow', '如何全部平仓', 'ARTICLE', '全部平仓会记录本次交易结果并释放持仓。', 360, TRUE, 'TRAINING', 40, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_history', 'chapter_training_flow', '如何查看历史记录', 'ARTICLE', '历史记录用于查看每轮训练结果、交易动作和盈亏情况。', 360, TRUE, 'TRAINING', 50, 'PUBLISHED', NOW(), NOW()),
  ('lesson_training_review', 'chapter_training_flow', '如何复盘总结', 'ARTICLE', '训练结束后记录问题标签和总结，把错误动作转化为下一轮训练目标。', 480, TRUE, 'TRAINING', 60, 'PUBLISHED', NOW(), NOW());
