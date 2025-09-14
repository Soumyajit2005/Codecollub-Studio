import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkAdminRole, checkOwnerRole } from '../middleware/permissions.middleware.js';
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  joinRoomByCode,
  getPublicRooms,
  updateCode,
  leaveRoom,
  deleteRoom,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  updateParticipantPermissions,
  removeParticipant,
  updateRoomSettings
} from '../controllers/roomController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/public', getPublicRooms);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.delete('/:roomId', deleteRoom);
router.post('/join-by-code', joinRoomByCode);
router.put('/:roomId/code', updateCode);

// Join request management routes (admin/owner only)
router.get('/:roomId/join-requests', checkAdminRole, getJoinRequests);
router.post('/:roomId/join-requests/:requestId/approve', checkAdminRole, approveJoinRequest);
router.post('/:roomId/join-requests/:requestId/reject', checkAdminRole, rejectJoinRequest);

// Participant management routes (admin/owner only)
router.put('/:roomId/participants/:participantId/permissions', checkAdminRole, updateParticipantPermissions);
router.delete('/:roomId/participants/:participantId', checkAdminRole, removeParticipant);

// Room settings (owner only)
router.put('/:roomId/settings', checkOwnerRole, updateRoomSettings);

export default router;