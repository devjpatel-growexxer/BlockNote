import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SUBJECT, REFRESH_TOKEN_SUBJECT } from "../constants/auth-constants.js";
import { getServerEnv } from "./env.js";

export function signAccessToken(user) {
  const env = getServerEnv();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: ACCESS_TOKEN_SUBJECT
    },
    env.jwtAccessSecret,
    {
      expiresIn: `${env.jwtAccessTtlMinutes}m`
    }
  );
}

export function signRefreshToken(user) {
  const env = getServerEnv();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      type: REFRESH_TOKEN_SUBJECT
    },
    env.jwtRefreshSecret,
    {
      expiresIn: `${env.jwtRefreshTtlDays}d`
    }
  );
}

export function verifyAccessToken(token) {
  const env = getServerEnv();
  return jwt.verify(token, env.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  const env = getServerEnv();
  return jwt.verify(token, env.jwtRefreshSecret);
}
