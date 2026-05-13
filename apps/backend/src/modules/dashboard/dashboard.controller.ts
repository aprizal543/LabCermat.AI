import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/v1/dashboard/analis — hanya untuk role analis */
  @Get('analis')
  getAnalis(@CurrentUser() currentUser: RequestUser) {
    return this.dashboardService.getAnalisDashboard(currentUser);
  }

  /** GET /api/v1/dashboard/supervisor — hanya untuk role supervisor */
  @Get('supervisor')
  getSupervisor(@CurrentUser() currentUser: RequestUser) {
    return this.dashboardService.getSupervisorDashboard(currentUser);
  }
}
