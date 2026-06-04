export const dynamic = 'force-dynamic';

/**
 * Admin Menus API
 * CRUD operations for managing weekly menus
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { logger } from '@/lib/logger';
import {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  setActiveMenu,
  type CreateMenuData,
} from '@/lib/menus/repository';
import {
  createMenuSchema,
  updateMenuSchema,
  deleteMenuSchema,
} from '@/lib/menus/schema';

/**
 * GET /api/admin/menus
 * Fetch all menus for admin dashboard
 */
export async function GET(request: any) {
  const session = await requireAdminSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const admin = await requireAdmin(request);

    const menus = await getAllMenus();

    logger.info('API', 'Admin fetched menus', {
      adminEmail: admin.email,
      count: menus.length,
    });

    return NextResponse.json({
      success: true,
      menus,
      count: menus.length,
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin menus fetch error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menus' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/menus
 * Create a new menu OR set active menu
 */
export async function POST(request: any) {
  const session = await requireAdminSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    // Handle "set active" action
    if (json.action === 'setActive' && json.menuId) {
      const menu = await setActiveMenu(json.menuId);
      if (!menu) {
        return NextResponse.json(
          { success: false, error: 'Menu not found' },
          { status: 404 }
        );
      }

      logger.info('API', 'Active menu set by admin', {
        adminEmail: admin.email,
        menuId: json.menuId,
      });

      return NextResponse.json({
        success: true,
        menu,
        message: 'Active menu updated',
      });
    }

    const parsed = createMenuSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const menu = await createMenu(parsed.data as CreateMenuData);

    logger.info('API', 'Menu created by admin', {
      adminEmail: admin.email,
      menuId: menu.id,
      menuTitle: menu.title,
    });

    return NextResponse.json({
      success: true,
      menu,
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin menu create error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create menu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/menus
 * Update an existing menu
 */
export async function PUT(request: any) {
  const session = await requireAdminSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    const parsed = updateMenuSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { menuId, ...updateData } = parsed.data;

    const menu = await updateMenu(menuId, updateData);

    if (!menu) {
      return NextResponse.json(
        { success: false, error: 'Menu not found' },
        { status: 404 }
      );
    }

    logger.info('API', 'Menu updated by admin', {
      adminEmail: admin.email,
      menuId,
    });

    return NextResponse.json({
      success: true,
      menu,
      message: 'Menu updated successfully',
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin menu update error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update menu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/menus
 * Delete a menu
 */
export async function DELETE(request: any) {
  const session = await requireAdminSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const admin = await requireAdmin(request);
    const json = await request.json();

    const parsed = deleteMenuSchema.safeParse(json);
    if (!parsed.success) {
      const errors = parsed.error.flatten();
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const { menuId } = parsed.data;

    const deleted = await deleteMenu(menuId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Menu not found' },
        { status: 404 }
      );
    }

    logger.info('API', 'Menu deleted by admin', {
      adminEmail: admin.email,
      menuId,
    });

    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully',
    });
  } catch (error: any) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }

    logger.error('API', 'Admin menu delete error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete menu' },
      { status: 500 }
    );
  }
}
