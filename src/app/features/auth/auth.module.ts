import { NgModule } from "@angular/core";
import { LoginPageComponent } from "./pages/login.page";

// Feature module for authentication.
// LoginPageComponent is standalone; this module groups it for organizational
// purposes and to satisfy the required folder structure.
@NgModule({
  imports: [LoginPageComponent],
  exports: [LoginPageComponent],
})
export class AuthModule {}
