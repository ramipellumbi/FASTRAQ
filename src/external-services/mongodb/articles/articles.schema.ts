import mongoose from 'mongoose';

import { IArticle, TAGS } from '@/schemas/articles';

const { Schema } = mongoose;

const ArticleSchema = new Schema<IArticle>({
  author: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    unique: true,
  },
  content: {
    type: String,
    required: true,
  },
  tags: [
    {
      type: String,
      enum: TAGS,
      required: true,
    },
  ],
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

export const ArticleModel = mongoose.model<IArticle>('Articles', ArticleSchema);
export type IArticleModel = typeof ArticleModel;
