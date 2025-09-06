import { body, param, query } from 'express-validator';

export const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const roomValidation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters')
    .trim(),
  body('language')
    .optional()
    .isIn(['javascript', 'python', 'cpp', 'csharp', 'java', 'go', 'rust', 'typescript'])
    .withMessage('Invalid programming language'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value')
];

export const roomIdValidation = [
  param('roomId')
    .isMongoId()
    .withMessage('Invalid room ID format')
];

export const codeExecutionValidation = [
  body('code')
    .isString()
    .withMessage('Code must be a string')
    .isLength({ max: 100000 })
    .withMessage('Code is too long (max 100KB)'),
  body('language')
    .isIn(['javascript', 'python', 'cpp', 'csharp', 'java', 'go', 'rust', 'typescript'])
    .withMessage('Invalid programming language'),
  body('input')
    .optional()
    .isString()
    .isLength({ max: 10000 })
    .withMessage('Input is too long (max 10KB)')
];

export const reviewValidation = [
  body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('Review title must be between 1 and 200 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description is too long (max 1000 characters)'),
  body('files')
    .isArray({ min: 1 })
    .withMessage('At least one file must be included in the review'),
  body('files.*.filename')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Filename must be between 1 and 255 characters'),
  body('files.*.content')
    .isString()
    .isLength({ max: 100000 })
    .withMessage('File content is too long (max 100KB)')
];

export const profileUpdateValidation = [
  body('firstName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('First name is too long (max 50 characters)')
    .trim(),
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name is too long (max 50 characters)')
    .trim(),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio is too long (max 500 characters)'),
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location is too long (max 100 characters)'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('company')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Company name is too long (max 100 characters)')
];

export const preferencesValidation = [
  body('theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either light or dark'),
  body('language')
    .optional()
    .isIn(['javascript', 'python', 'cpp', 'csharp', 'java', 'go', 'rust', 'typescript'])
    .withMessage('Invalid default language'),
  body('fontSize')
    .optional()
    .isInt({ min: 10, max: 24 })
    .withMessage('Font size must be between 10 and 24'),
  body('notifications.email')
    .optional()
    .isBoolean(),
  body('notifications.browser')
    .optional()
    .isBoolean(),
  body('notifications.collaborationInvites')
    .optional()
    .isBoolean()
];

export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];