import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { authInterceptor } from "./app/core/interceptors/auth.interceptor";

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor]))],
}).catch((err) => console.error(err));
