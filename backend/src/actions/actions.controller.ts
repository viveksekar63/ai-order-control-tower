import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActionsService } from './actions.service';
import { ApprovalDto } from './dto/approval.dto';
import { RequestActionDto } from './dto/request-action.dto';

@Controller('actions')
export class ActionsController {
  constructor(private readonly actions: ActionsService) {}

  @Post()
  request(@Body() dto: RequestActionDto) {
    return this.actions.request(dto);
  }

  @Post(':actionId/approve')
  approve(@Param('actionId') actionId: string, @Body() dto: ApprovalDto) {
    return this.actions.approve(actionId, dto.actorId);
  }

  @Post(':actionId/reject')
  reject(@Param('actionId') actionId: string, @Body() dto: ApprovalDto) {
    return this.actions.reject(actionId, dto.actorId);
  }

  @Post(':actionId/execute')
  execute(@Param('actionId') actionId: string) {
    return this.actions.execute(actionId);
  }

  @Get('order/:orderId')
  listByOrder(@Param('orderId') orderId: string) {
    return this.actions.listByOrder(orderId);
  }
}
