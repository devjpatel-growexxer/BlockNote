import { AUTH_CODES, HTTP_STATUS } from "../constants/auth-constants.js";
import { createUser, findUserByEmail, findUserById } from "../repositories/user-repository.js";
import { AppError } from "../utils/app-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt
  };
}

function buildAuthResponse(user) {
  return {
    user: sanitizeUser(user),
    accessToken: signAccessToken(user)
  };
}

export async function registerUser({ email, password }) {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError({
      message: "Email is already registered.",
      statusCode: HTTP_STATUS.CONFLICT,
      code: AUTH_CODES.EMAIL_IN_USE
    });
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    email: normalizedEmail,
    passwordHash
  });

  return {
    ...buildAuthResponse(user),
    refreshToken: signRefreshToken(user)
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError({
      message: "Invalid email or password.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.INVALID_CREDENTIALS
    });
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError({
      message: "Invalid email or password.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.INVALID_CREDENTIALS
    });
  }

  return {
    ...buildAuthResponse(user),
    refreshToken: signRefreshToken(user)
  };
}

export async function refreshUserSession(refreshToken) {
  if (!refreshToken) {
    throw new AppError({
      message: "Refresh token is required.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.INVALID_REFRESH_TOKEN
    });
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError({
      message: "Refresh token is invalid or expired.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.INVALID_REFRESH_TOKEN
    });
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw new AppError({
      message: "Refresh token is invalid or expired.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.INVALID_REFRESH_TOKEN
    });
  }

  return {
    ...buildAuthResponse(user),
    refreshToken: signRefreshToken(user)
  };
}

export async function getCurrentUser(userId) {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError({
      message: "Authentication is required.",
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: AUTH_CODES.AUTH_REQUIRED
    });
  }

  return sanitizeUser(user);
}
