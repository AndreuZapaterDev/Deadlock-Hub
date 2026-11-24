import { httpSource } from "./http-source";
import { mockSource } from "./mock-source";
import type { DataSource } from "./types";

export const getSource = (): DataSource => (process.env.DATA_SOURCE === "api" ? httpSource : mockSource);
export * from "./types";
