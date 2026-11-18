import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * Validates actual binary magic bytes of uploaded files to prevent spoofed MIME types.
 * Allowed formats: JPEG, PNG, WebP.
 */
export const validateUploadedImageMagicBytes = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const files: Express.Multer.File[] = [];

  if (req.file) {
    files.push(req.file);
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      Object.values(req.files).forEach((f) => files.push(...f));
    }
  }

  // If no files uploaded, continue (images are optional or validated at schema level)
  if (files.length === 0) {
    return next();
  }

  for (const file of files) {
    const filePath = file.path;
    try {
      if (!fs.existsSync(filePath)) {
        res.status(400).json({
          success: false,
          message: `Uploaded file not found on disk: ${file.originalname}`,
        });
        return;
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: `Uploaded file '${file.originalname}' is empty (0 bytes).`,
        });
        return;
      }

      if (stats.size > 5 * 1024 * 1024) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: `Uploaded file '${file.originalname}' exceeds the 5MB size limit.`,
        });
        return;
      }

      // Read initial 12 bytes for magic number header verification
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a;
      const isWebP =
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 && // RIFF
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50; // WEBP

      if (!isJpeg && !isPng && !isWebP) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: `Security validation failed for '${file.originalname}': File signature does not match allowed image formats (JPEG, PNG, WebP).`,
        });
        return;
      }

      // Verify extension matches
      const ext = path.extname(file.originalname).toLowerCase();
      const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
      if (!validExts.includes(ext)) {
        fs.unlinkSync(filePath);
        res.status(400).json({
          success: false,
          message: `Invalid file extension '${ext}'. Allowed extensions: .jpg, .jpeg, .png, .webp`,
        });
        return;
      }
    } catch (err: any) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
      res.status(500).json({
        success: false,
        message: `Image inspection error: ${err.message}`,
      });
      return;
    }
  }

  next();
};
