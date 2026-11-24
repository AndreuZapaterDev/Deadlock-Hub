import "server-only";
import { ApiError, type ApiResult, type DataSource } from "./types";

/** Fase 9: aquí irá el cliente real (reintentos, timeout, X-Api-Key). Hasta entonces no sale nada a la red. */
export const httpSource: DataSource = {
  async get<T>(): Promise<ApiResult<T>> {
    if (process.env.DATA_SOURCE !== "api") {
      throw new ApiError(500, "httpSource solo se puede usar con DATA_SOURCE=api");
    }
    throw new ApiError(501, "httpSource aún no implementado (fase 9)");
  },
};
