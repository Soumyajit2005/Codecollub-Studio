import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkRoomPermission, checkFilePermission } from '../middleware/permissions.middleware.js';
import {
  getFileTree,
  createFile,
  updateFile,
  deleteFile,
  setActiveFile,
  moveFile,
  initializeDefaultFiles,
  // Virtual File System endpoints
  getVirtualFileTree,
  readVirtualFile,
  writeVirtualFile,
  createVirtualFile,
  deleteVirtualFile,
  renameVirtualFile,
  searchVirtualFiles,
  exportVirtualFiles,
  importVirtualFiles,
  getVirtualFileSystemStats
} from '../controllers/fileSystemController.js';

const router = express.Router();

router.use(authenticate);

// Traditional File tree operations
router.get('/:roomId/files', checkRoomPermission(), getFileTree);
router.post('/:roomId/files/init', checkFilePermission('create'), initializeDefaultFiles);
router.post('/:roomId/files', checkFilePermission('create'), createFile);
router.put('/:roomId/files/:fileId', checkFilePermission('write'), updateFile);
router.delete('/:roomId/files/:fileId', checkFilePermission('delete'), deleteFile);
router.post('/:roomId/files/:fileId/active', checkFilePermission('read'), setActiveFile);
router.put('/:roomId/files/:fileId/move', checkFilePermission('rename'), moveFile);

// Virtual File System operations
router.get('/:roomId/virtual/tree', checkRoomPermission(), getVirtualFileTree);
router.get('/:roomId/virtual/read', checkRoomPermission(), readVirtualFile);
router.post('/:roomId/virtual/write', checkFilePermission('write'), writeVirtualFile);
router.post('/:roomId/virtual/create', checkFilePermission('create'), createVirtualFile);
router.delete('/:roomId/virtual/delete', checkFilePermission('delete'), deleteVirtualFile);
router.put('/:roomId/virtual/rename', checkFilePermission('rename'), renameVirtualFile);
router.get('/:roomId/virtual/search', checkRoomPermission(), searchVirtualFiles);
router.get('/:roomId/virtual/export', checkRoomPermission(), exportVirtualFiles);
router.post('/:roomId/virtual/import', checkFilePermission('create'), importVirtualFiles);
router.get('/:roomId/virtual/stats', checkRoomPermission(), getVirtualFileSystemStats);

export default router;