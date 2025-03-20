import { IsEnum } from 'class-validator';
import { ReviewRating } from '@prisma/client';



export class ReviewDto {

  @IsEnum(ReviewRating)
  rating: ReviewRating;
  
}
