import { createApp } from "./app.js";
import { getServerEnv } from "./utils/env.js";

const env = getServerEnv();
const app = createApp();

app.listen(env.apiPort, () => {
  console.log(`API listening on port ${env.apiPort}`);
});
