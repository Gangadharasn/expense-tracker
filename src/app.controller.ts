import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { DataService } from './data/data.service';

@Controller()
export class AppController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  serveApp(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }

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
