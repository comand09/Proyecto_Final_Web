// Feature-local interfaces for the auth feature.
// Currently the auth feature reuses models from core/models/shipcore.models.ts;
// this file is reserved for auth-specific shapes (e.g. login form payloads).
export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginSubmitPayload extends LoginFormData {}
