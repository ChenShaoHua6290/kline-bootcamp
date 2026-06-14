import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

const COURSE_STATUS_VALUES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const COURSE_ACCESS_VALUES = ['PREVIEW', 'TRAINING', 'FULL', 'INTERNAL'] as const;
const LESSON_TYPE_VALUES = ['VIDEO', 'ARTICLE', 'PDF', 'MIXED'] as const;
const ASSIGNMENT_SOURCE_VALUES = ['trial', 'courseAssignment'] as const;
const TRAINING_MODE_VALUES = ['mixed', 'zeroAxis', 'divergence', 'synthesis', 'trend', 'pullback'] as const;

function trimText(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CourseDto {
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(180)
  subtitle?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  relatedLinks?: unknown;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class UpdateCourseDto {
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(180)
  subtitle?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  relatedLinks?: unknown;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class ChapterDto {
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class UpdateChapterDto {
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export class TrainingAssignmentDto {
  @IsIn(ASSIGNMENT_SOURCE_VALUES)
  assignmentSource!: 'trial' | 'courseAssignment';

  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(80)
  assignmentId!: string;

  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(160)
  assignmentTitle!: string;

  @IsIn(TRAINING_MODE_VALUES)
  trainingMode!: 'mixed' | 'zeroAxis' | 'divergence' | 'synthesis' | 'trend' | 'pullback';

  @IsInt()
  @Min(1)
  assignmentVersion!: number;
}

export class LessonDto {
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  chapterId?: string;

  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsIn(LESSON_TYPE_VALUES)
  type!: 'VIDEO' | 'ARTICLE' | 'PDF' | 'MIXED';

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(80)
  videoProvider?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(240)
  videoFileId?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  videoUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  attachmentUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsIn(COURSE_ACCESS_VALUES)
  accessLevel?: 'PREVIEW' | 'TRAINING' | 'FULL' | 'INTERNAL';

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @ValidateNested()
  @Type(() => TrainingAssignmentDto)
  trainingAssignment?: TrainingAssignmentDto | null;
}

export class UpdateLessonDto {
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  chapterId?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(LESSON_TYPE_VALUES)
  type?: 'VIDEO' | 'ARTICLE' | 'PDF' | 'MIXED';

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(20000)
  content?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(80)
  videoProvider?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(240)
  videoFileId?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  videoUrl?: string;

  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(1000)
  attachmentUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;

  @IsOptional()
  @IsIn(COURSE_ACCESS_VALUES)
  accessLevel?: 'PREVIEW' | 'TRAINING' | 'FULL' | 'INTERNAL';

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsIn(COURSE_STATUS_VALUES)
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @ValidateNested()
  @Type(() => TrainingAssignmentDto)
  trainingAssignment?: TrainingAssignmentDto | null;
}
