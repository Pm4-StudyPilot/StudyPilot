import type { Express } from 'express';
import { prisma } from '../config/database';

/**
 * Input type for document upload.
 */
type UploadDocumentInput = {
  file: Express.Multer.File;
  courseId: string;
  ownerId: string;
};

/**
 * Service responsible for document-related business logic.
 * Handles interaction with the database and validation rules.
 */
class DocumentService {
  /**
   * Uploads a document and stores its metadata in the database.
   *
   * @param file Uploaded file from multer
   * @param courseId ID of the course the document belongs to
   * @param ownerId ID of the uploading user
   * @returns Created document entry
   */
  async upload({ file, courseId, ownerId }: UploadDocumentInput) {
    // Check if the course exists and belongs to the uploading user
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ownerId,
      },
    });

    if (!course) {
      throw new Error('Course not found.');
    }

    // Create document entry in database
    const document = await prisma.document.create({
      data: {
        filename: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        courseId,
        ownerId,
      },
    });

    return document;
  }

  /**
   * Returns all documents for a course owned by the authenticated user.
   *
   * @param courseId ID of the course
   * @param ownerId ID of the authenticated user
   * @returns List of documents sorted by newest first
   */
  async listByCourse(courseId: string, ownerId: string) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ownerId,
      },
    });

    if (!course) {
      throw new Error('Course not found.');
    }

    return prisma.document.findMany({
      where: {
        courseId,
        ownerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export { DocumentService };
