const requiredClientEnv = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_API_URL"];

export function getClientEnv() {
  const env = {
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL
  };

  const missing = requiredClientEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing client environment variables: ${missing.join(", ")}`);
  }

  return env;
}
