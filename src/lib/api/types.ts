export type Query = Record<string, string | number | boolean | undefined>;

export type ApiResult<T = unknown> = {
  /** Código HTTP de la API (puede ser 4xx/5xx: las páginas lo tratan, no es una excepción). */
  status: number;
  contentType: string;
  data: T;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Contrato único de acceso a los datos: las páginas y los componentes no saben cómo se piden. */
export interface DataSource {
  get<T = unknown>(path: string, query?: Query): Promise<ApiResult<T>>;
}
