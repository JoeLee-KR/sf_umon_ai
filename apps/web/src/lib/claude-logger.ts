import fs from 'fs';
import path from 'path';

/**
 * Claude AI 분석 요청 진행 상황 로거
 * apps/web/logs/claude-request-YYYYMMDDHHMM.log 형태로 기록
 */
export class ClaudeLogger {
  private logFileName: string;
  private logFilePath: string;

  constructor() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    this.logFileName = `claude-request-${year}${month}${day}${hours}${minutes}.log`;

    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, this.logFileName);
  }

  public getFileName(): string {
    return this.logFileName;
  }

  public getFilePath(): string {
    return this.logFilePath;
  }

  public log(milestone: string, details?: string | object) {
    const nowStr = new Date().toISOString();
    let entry = `[${nowStr}] = ${milestone}\n`;

    if (details !== undefined && details !== null) {
      if (typeof details === 'string') {
        entry += `${details}\n`;
      } else {
        entry += `${JSON.stringify(details, null, 2)}\n`;
      }
    }
    entry += `--------------------------------------------------\n`;

    try {
      fs.appendFileSync(this.logFilePath, entry, 'utf-8');
    } catch (err) {
      console.error('ClaudeLogger write error:', err);
    }
  }
}
