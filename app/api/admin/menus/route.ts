export const dynamic = 'force-dynamic';

/**
 * Admin Menus API
 * CRUD operations for managing weekly menus
 */

import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/unified-admin';
import { logger } from '@/lib/logger';
import {tursoPreviewSelected} from '@/lib/checkout/turso-preview-runtime.mjs';
import {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  setActiveMenu,
} from '@/lib/menus/repository';
import {
  createMenuSchema,
  updateMenuSchema,
  deleteMenuSchema,
  setActiveMenuSchema,
} from '@/lib/menus/schema';

/**
 * GET /api/admin/menus
 * Fetch all menus for admin dashboard
 */
export async function GET(request: any) {
  try {
    const admin = await requireAdminSession(request);

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
    if(error.name === 'TursoMenuError')return NextResponse.json({success:false,error:error.code},{status:error.status});
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
  try {
    const admin = await requireAdminSession(request);
    const json = await request.json();

    // Handle "set active" action
    if (json.action === 'setActive') {
      const selection=setActiveMenuSchema.safeParse(json);
      if(!selection.success)return NextResponse.json({success:false,error:'Invalid menu selection'},{status:400});
      const menu = await setActiveMenu(selection.data.menuId);
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

    const menu = await createMenu(parsed.data);

    // Enforce single-active: deactivate others when creating an active menu
    if (parsed.data.isActive && !tursoPreviewSelected()) {
      await setActiveMenu(menu.id);
    }

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
    if(error.name === 'TursoMenuError')return NextResponse.json({success:false,error:error.code},{status:error.status});
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
  try {
    const admin = await requireAdminSession(request);
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

    // Enforce single-active: deactivate others when setting a menu active
    if (updateData.isActive && menu && !tursoPreviewSelected()) {
      await setActiveMenu(menuId);
    }

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
    if(error.name === 'TursoMenuError')return NextResponse.json({success:false,error:error.code},{status:error.status});
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
  try {
    const admin = await requireAdminSession(request);
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
      message: tursoPreviewSelected() ? 'Menu archived; history preserved' : 'Menu deleted successfully',
    });
  } catch (error: any) {
    if(error.name === 'TursoMenuError')return NextResponse.json({success:false,error:error.code},{status:error.status});
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
