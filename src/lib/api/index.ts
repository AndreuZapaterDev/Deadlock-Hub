import { httpSource } from "./http-source";
import type { DataSource } from "./types";

/** Toda la web lee de la API real (`api.deadlock-api.com`): no hay modo demo ni fixtures. */
export const getSource = (): DataSource => httpSource;
export * from "./types";
