// SharedModule: re-exports commonly used standalone shared components,
// pipes, directives and validators. Import into feature modules that need
// to use the shared UI kit without re-declaring each piece.
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { PageHeaderComponent } from "./components/page-header/page-header.component";
import { DataStateComponent } from "./components/data-state/data-state.component";
import { DataTableComponent } from "./components/data-table/data-table.component";
import { ConfirmDialogComponent } from "./components/confirm-dialog/confirm-dialog.component";
import { ToasterComponent } from "./components/toaster/toaster.component";
import { RoleDeniedComponent } from "./components/role-denied/role-denied.component";
import { BarChartComponent } from "./components/bar-chart/bar-chart.component";
import { CurrencyPipe } from "./pipes/currency.pipe";
import { DatePipe } from "./pipes/date.pipe";
import { AppButtonDirective } from "./directives/app-button.directive";
import { dateRangeValidator } from "./validators/date-range.validator";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    DataStateComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    ToasterComponent,
    RoleDeniedComponent,
    BarChartComponent,
    CurrencyPipe,
    DatePipe,
    AppButtonDirective,
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageHeaderComponent,
    DataStateComponent,
    DataTableComponent,
    ConfirmDialogComponent,
    ToasterComponent,
    RoleDeniedComponent,
    BarChartComponent,
    CurrencyPipe,
    DatePipe,
    AppButtonDirective,
    // Validators are functions, exported directly via the file.
  ],
})
export class SharedModule {}
