import i18n from '../i18n';

const API_MESSAGE_KEYS: Record<string, string> = {
  'All order entries must be strings': 'common.apiMessages.allOrderEntriesMustBeStrings',
  'Answer content is required': 'common.apiMessages.answerContentRequired',
  'Answer id is required': 'common.apiMessages.answerIdRequired',
  'Answer not found': 'common.apiMessages.answerNotFound',
  'Availability check failed': 'common.apiMessages.availabilityCheckFailed',
  'Course already shared with this user': 'common.apiMessages.courseAlreadyShared',
  'Course color must be a valid hex color': 'common.apiMessages.courseColorInvalid',
  'Course id and user id are required': 'common.apiMessages.courseIdAndUserIdRequired',
  'Course id is required': 'common.apiMessages.courseIdRequired',
  'Course is already shared with this user': 'common.apiMessages.courseAlreadyShared',
  'Course name is required': 'common.apiMessages.courseNameRequired',
  'Course not found': 'common.apiMessages.courseNotFound',
  'Course not found.': 'common.apiMessages.courseNotFound',
  'Course not found or task ids are invalid': 'common.apiMessages.courseOrTaskIdsInvalid',
  'Course share not found': 'common.apiMessages.courseShareNotFound',
  'Current password and new password are required':
    'common.apiMessages.currentAndNewPasswordRequired',
  'Current password is incorrect': 'common.apiMessages.currentPasswordIncorrect',
  DOCUMENT_ACCESS_DENIED: 'common.apiMessages.documentAccessDenied',
  DOCUMENT_FORBIDDEN: 'common.apiMessages.documentDeleteForbidden',
  DOCUMENT_NOT_FOUND: 'common.apiMessages.documentNotFound',
  'Document not found.': 'common.apiMessages.documentNotFound',
  'Duplicate entry': 'common.apiMessages.duplicateEntry',
  'Email already exists': 'common.apiMessages.emailAlreadyExists',
  'Email and username are required': 'common.apiMessages.emailAndUsernameRequired',
  'Email is already in use': 'common.apiMessages.emailAlreadyInUse',
  'Email is required': 'common.apiMessages.emailRequired',
  'Email or username and password are required':
    'common.apiMessages.emailOrUsernameAndPasswordRequired',
  'Email, username, and password are required':
    'common.apiMessages.emailUsernameAndPasswordRequired',
  'Failed to change password': 'common.apiMessages.changePasswordFailed',
  'Failed to create answer': 'common.apiMessages.createAnswerFailed',
  'Failed to create course': 'common.apiMessages.createCourseFailed',
  'Failed to create question': 'common.apiMessages.createQuestionFailed',
  'Failed to create quiz': 'common.apiMessages.createQuizFailed',
  'Failed to create task': 'common.apiMessages.createTaskFailed',
  'Failed to delete answer': 'common.apiMessages.deleteAnswerFailed',
  'Failed to delete course': 'common.apiMessages.deleteCourseFailed',
  'Failed to delete document.': 'common.apiMessages.deleteDocumentFailed',
  'Failed to delete question': 'common.apiMessages.deleteQuestionFailed',
  'Failed to delete quiz': 'common.apiMessages.deleteQuizFailed',
  'Failed to delete task': 'common.apiMessages.deleteTaskFailed',
  'Failed to download document.': 'common.apiMessages.downloadDocumentFailed',
  'Failed to fetch answer': 'common.apiMessages.fetchAnswerFailed',
  'Failed to fetch answers': 'common.apiMessages.fetchAnswersFailed',
  'Failed to fetch course': 'common.apiMessages.fetchCourseFailed',
  'Failed to fetch course documents.': 'common.apiMessages.fetchCourseDocumentsFailed',
  'Failed to fetch courses': 'common.apiMessages.fetchCoursesFailed',
  'Failed to fetch documents.': 'common.apiMessages.fetchDocumentsFailed',
  'Failed to fetch question': 'common.apiMessages.fetchQuestionFailed',
  'Failed to fetch questions': 'common.apiMessages.fetchQuestionsFailed',
  'Failed to fetch quiz': 'common.apiMessages.fetchQuizFailed',
  'Failed to fetch quizzes': 'common.apiMessages.fetchQuizzesFailed',
  'Failed to fetch shared courses': 'common.apiMessages.fetchSharedCoursesFailed',
  'Failed to fetch shared users': 'common.apiMessages.fetchSharedUsersFailed',
  'Failed to fetch task': 'common.apiMessages.fetchTaskFailed',
  'Failed to fetch tasks': 'common.apiMessages.fetchTasksFailed',
  'Failed to fetch user': 'common.apiMessages.fetchUserFailed',
  'Failed to get upload URL': 'common.apiMessages.getUploadUrlFailed',
  'Failed to process chat message': 'common.apiMessages.processChatMessageFailed',
  'Failed to process password reset request':
    'common.apiMessages.processPasswordResetRequestFailed',
  'Failed to read document.': 'common.apiMessages.readDocumentFailed',
  'Failed to reorder answers': 'common.apiMessages.reorderAnswersFailed',
  'Failed to reorder questions': 'common.apiMessages.reorderQuestionsFailed',
  'Failed to reorder tasks': 'common.apiMessages.reorderTasksFailed',
  'Failed to reset password': 'common.apiMessages.resetPasswordFailed',
  'Failed to stream document.': 'common.apiMessages.streamDocumentFailed',
  'Failed to unshare course': 'common.apiMessages.unshareCourseFailed',
  'Failed to update answer': 'common.apiMessages.updateAnswerFailed',
  'Failed to update course': 'common.apiMessages.updateCourseFailed',
  'Failed to update profile': 'common.apiMessages.updateProfileFailed',
  'Failed to update question': 'common.apiMessages.updateQuestionFailed',
  'Failed to update quiz': 'common.apiMessages.updateQuizFailed',
  'Failed to update task': 'common.apiMessages.updateTaskFailed',
  'Failed to update task completion': 'common.apiMessages.updateTaskCompletionFailed',
  'Failed to upload document.': 'common.apiMessages.uploadDocumentFailed',
  'File is required.': 'common.apiMessages.fileRequired',
  'File is too large. Maximum size is 50 MB.': 'common.apiMessages.fileTooLarge',
  'If this email is registered, you will receive a password reset link.':
    'common.apiMessages.passwordResetEmailSent',
  'Internal server error': 'common.apiMessages.internalServerError',
  'Invalid credentials': 'common.apiMessages.invalidCredentials',
  'Invalid due date': 'common.apiMessages.invalidDueDate',
  'Invalid email address': 'common.apiMessages.invalidEmailAddress',
  'Invalid email format': 'common.apiMessages.invalidEmailFormat',
  'Invalid or expired password reset token': 'common.apiMessages.invalidResetToken',
  'Invalid priority value': 'common.apiMessages.invalidPriority',
  'Invalid question type': 'common.apiMessages.invalidQuestionType',
  'Invalid status value': 'common.apiMessages.invalidStatus',
  'Invalid upload request.': 'common.apiMessages.invalidUploadRequest',
  'Login failed': 'common.apiMessages.loginFailed',
  'Message is required': 'common.apiMessages.messageRequired',
  'Password changed successfully': 'common.apiMessages.passwordChanged',
  'Password does not meet security requirements': 'common.apiMessages.passwordSecurity',
  'Password has been reset successfully. You can now log in.': 'common.apiMessages.passwordReset',
  'Question content cannot be empty': 'common.apiMessages.questionContentRequired',
  'Question id is required': 'common.apiMessages.questionIdRequired',
  'Question isCorrect cannot be empty': 'common.apiMessages.questionCorrectRequired',
  'Question not found': 'common.apiMessages.questionNotFound',
  'Question not found or answer ids are invalid': 'common.apiMessages.questionOrAnswerIdsInvalid',
  'Question title cannot be empty': 'common.apiMessages.questionTitleRequired',
  'Question title is required': 'common.apiMessages.questionTitleRequired',
  'Quiz id is required': 'common.apiMessages.quizIdRequired',
  'Quiz not found': 'common.apiMessages.quizNotFound',
  'Quiz not found or question ids are invalid': 'common.apiMessages.quizOrQuestionIdsInvalid',
  'Quiz title cannot be empty': 'common.apiMessages.quizTitleRequired',
  'Quiz title is required': 'common.apiMessages.quizTitleRequired',
  'Registration failed': 'common.apiMessages.registrationFailed',
  'Task id is required': 'common.apiMessages.taskIdRequired',
  'Task not found': 'common.apiMessages.taskNotFound',
  'Task title cannot be empty': 'common.apiMessages.taskTitleRequired',
  'Task title is required': 'common.apiMessages.taskTitleRequired',
  'Token and new password are required': 'common.apiMessages.tokenAndPasswordRequired',
  'Too many attempts, please try again later': 'common.apiMessages.tooManyAttempts',
  'Too many requests, please try again later': 'common.apiMessages.tooManyRequests',
  Unauthorized: 'common.apiMessages.unauthorized',
  'Unauthorized.': 'common.apiMessages.unauthorized',
  'Upload to MinIO failed': 'common.apiMessages.minioUploadFailed',
  'User not found': 'common.apiMessages.userNotFound',
  'Username already exists': 'common.apiMessages.usernameAlreadyExists',
  'Username is already in use': 'common.apiMessages.usernameAlreadyInUse',
  'Username must be at least 3 characters': 'common.apiMessages.usernameMin',
  'Username or email is required': 'common.apiMessages.usernameOrEmailRequired',
  'You cannot share a course with yourself': 'common.apiMessages.selfShare',
  'You do not have access to this document.': 'common.apiMessages.documentAccessDenied',
  'You do not have permission to delete this document.':
    'common.apiMessages.documentDeleteForbidden',
  'bucket and filename are required': 'common.apiMessages.bucketAndFilenameRequired',
  'completed must be a boolean': 'common.apiMessages.completedMustBeBoolean',
  'courseId is required.': 'common.apiMessages.courseIdRequired',
  'id is required.': 'common.apiMessages.idRequired',
  'order must be a non-empty array of question ids': 'common.apiMessages.questionOrderRequired',
  'order must be a non-empty array of task ids': 'common.apiMessages.taskOrderRequired',
};

export function translateApiMessage(message: string): string {
  if (message.startsWith('Request failed:')) {
    return i18n.t('common.apiMessages.requestFailed', {
      status: message.replace('Request failed:', '').trim(),
      defaultValue: message,
    });
  }

  if (message.startsWith('Upload error:')) {
    return i18n.t('common.apiMessages.uploadError', {
      message: message.replace('Upload error:', '').trim(),
      defaultValue: message,
    });
  }

  const key = API_MESSAGE_KEYS[message];
  if (!key) return message;

  return i18n.t(key, { defaultValue: message });
}

export function translateApiMessageInPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const maybeMessage = (payload as { message?: unknown }).message;
  if (typeof maybeMessage !== 'string') {
    return payload;
  }

  return {
    ...payload,
    message: translateApiMessage(maybeMessage),
  };
}
