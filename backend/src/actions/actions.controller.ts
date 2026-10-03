import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { ActionsService } from './actions.service';
import { RequestActionDto } from './dto/request-action.dto';

@Controller('actions')
@UseGuards(JwtAuthGuard)
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post()
  @RequirePermission('order.action.request')
  request(@Body() dto: RequestActionDto, @Req() req: { user?: { username: string } }) {
    dto.requestedBy = req.user!.username;
    return this.actions.request(dto);
  }

  @Post(':actionId/approve')
  @RequirePermission('order.action.approve')
  approve(@Param('actionId') actionId: string, @Req() req: Request & { user?: { username: string } }) {
    return this.actions.approve(actionId, req.user!.username);
  }

  @Post(':actionId/reject')
  @RequirePermission('order.action.approve')
  reject(@Param('actionId') actionId: string, @Req() req: Request & { user?: { username: string } }) {
    return this.actions.reject(actionId, req.user!.username);
  }

  @Post(':actionId/execute')
  @RequirePermission('order.execute')
  execute(@Param('actionId') actionId: string) {
    return this.actions.execute(actionId);
  }

  @Get('order/:orderId')
  listByOrder(@Param('orderId') orderId: string) {
    return this.actions.listByOrder(orderId);
  }
}
