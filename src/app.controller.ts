import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { Public } from './auth/public.decorator';
import { DataService } from './data/data.service';
import { getPublicDir } from './paths';

@Controller()
export class AppController {
  constructor(private readonly dataService: DataService) {}

  @Public()
  @Get()
  serveApp(@Res() res: Response) {
    res.sendFile(join(getPublicDir(), 'index.html'));
  }

  @Public()
  @Get('api/health')
  health() {
    const storage = this.dataService.getStorageInfo();
    return {
      status: 'ok',
      app: 'Expense Tracker',
      version: '1.0.0',
      storage,
    };
  }
}
