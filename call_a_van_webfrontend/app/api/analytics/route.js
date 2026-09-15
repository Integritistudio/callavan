import { NextResponse } from 'next/server';
import {
  ANALYTICS_EVENTS,
  appendAnalyticsEvent,
  detectDevice,
  getAnalyticsSummary,
  verifyAdminToken,
} from '@/lib/analyticsStore';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventName = String(body.event || '').trim();

    if (!ANALYTICS_EVENTS.includes(eventName)) {
      return NextResponse.json(
        { status: 'error', message: 'Unknown analytics event.' },
        { status: 400 }
      );
    }

    const ua = request.headers.get('user-agent') || '';
    const saved = await appendAnalyticsEvent({
      event: eventName,
      userType: body.userType || 'guest',
      userEmail: body.userEmail || '',
      driverEmail: body.driverEmail || '',
      device: body.device || detectDevice(ua),
    });

    return NextResponse.json({ status: 'success', event: saved });
  } catch (error) {
    console.error('Analytics POST error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to record event.' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const auth = request.headers.get('authorization') || '';
    if (!verifyAdminToken(auth)) {
      return NextResponse.json(
        { status: 'error', message: 'Admin authentication required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '150', 10);
    const summary = await getAnalyticsSummary({ limit });

    return NextResponse.json({
      status: 'success',
      ...summary,
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to load analytics.' },
      { status: 500 }
    );
  }
}
