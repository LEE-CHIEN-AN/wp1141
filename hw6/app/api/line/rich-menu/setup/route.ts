import { NextRequest, NextResponse } from "next/server";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_API_BASE = "https://api.line.me/v2/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rich Menu 定義
 * 四個按鈕，2x2 佈局（全螢幕 2500x1686）
 */
const RICH_MENU_DEFINITION = {
  size: {
    width: 2500,
    height: 1686, // 全螢幕
  },
  selected: false,
  name: "台大女八舍宿網小精靈 - 主選單",
  chatBarText: "主選單",
  areas: [
    // 按鈕 1：無法上網（左上）
    {
      bounds: {
        x: 0,
        y: 0,
        width: 1250,
        height: 843,
      },
      action: {
        type: "postback",
        data: "action:connection_troubleshoot",
        displayText: "無法上網",
      },
    },
    // 按鈕 2：如何註冊（右上）
    {
      bounds: {
        x: 1250,
        y: 0,
        width: 1250,
        height: 843,
      },
      action: {
        type: "postback",
        data: "action:registration_guide",
        displayText: "如何註冊",
      },
    },
    // 按鈕 3：網速很慢（左下）
    {
      bounds: {
        x: 0,
        y: 843,
        width: 1250,
        height: 843,
      },
      action: {
        type: "postback",
        data: "action:speed_check",
        displayText: "網速很慢",
      },
    },
    // 按鈕 4：聯絡網管（右下）
    {
      bounds: {
        x: 1250,
        y: 843,
        width: 1250,
        height: 843,
      },
      action: {
        type: "postback",
        data: "action:contact",
        displayText: "聯絡網管",
      },
    },
  ],
};

/**
 * 建立 Rich Menu
 */
async function createRichMenu() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  const response = await fetch(`${LINE_API_BASE}/richmenu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(RICH_MENU_DEFINITION),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create rich menu: ${error}`);
  }

  const data = await response.json();
  return data.richMenuId;
}

/**
 * 上傳 Rich Menu 圖片
 * @param richMenuId Rich Menu ID
 * @param imageUrl 圖片 URL（可以是公開 URL 或 base64）
 */
async function uploadRichMenuImage(richMenuId: string, imageUrl: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  // 如果是 URL，先下載圖片
  let imageBuffer: ArrayBuffer | Uint8Array;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }
    imageBuffer = await imageResponse.arrayBuffer();
  } else {
    // 假設是 base64，轉換為 Uint8Array
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    imageBuffer = new Uint8Array(buffer);
  }

  const response = await fetch(
    `${LINE_API_BASE}/richmenu/${richMenuId}/content`,
    {
      method: "POST",
      headers: {
        "Content-Type": "image/png",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: imageBuffer,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload rich menu image: ${error}`);
  }
}

/**
 * 設定為預設 Rich Menu（所有使用者）
 */
async function setDefaultRichMenu(richMenuId: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  const response = await fetch(
    `${LINE_API_BASE}/user/all/richmenu/${richMenuId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to set default rich menu: ${error}`);
  }
}

/**
 * 取得現有的 Rich Menu 列表
 */
async function getRichMenuList() {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  const response = await fetch(`${LINE_API_BASE}/richmenu/list`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get rich menu list: ${error}`);
  }

  return await response.json();
}

/**
 * 刪除 Rich Menu
 */
async function deleteRichMenu(richMenuId: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  const response = await fetch(`${LINE_API_BASE}/richmenu/${richMenuId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete rich menu: ${error}`);
  }
}

/**
 * POST /api/line/rich-menu/setup
 * 建立並設定 Rich Menu
 * 
 * Body (optional):
 * {
 *   "imageUrl": "https://example.com/rich-menu.png", // 圖片 URL
 *   "deleteExisting": true // 是否刪除現有的 Rich Menu
 * }
 */
export async function POST(request: NextRequest) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { imageUrl, deleteExisting } = body;

    // 如果要求刪除現有的 Rich Menu
    if (deleteExisting) {
      try {
        const existingMenus = await getRichMenuList();
        for (const menu of existingMenus.richmenus || []) {
          await deleteRichMenu(menu.richMenuId);
          console.log(`Deleted existing rich menu: ${menu.richMenuId}`);
        }
      } catch (error) {
        console.warn("Failed to delete existing rich menus:", error);
      }
    }

    // 建立 Rich Menu
    const richMenuId = await createRichMenu();
    console.log(`Rich Menu created: ${richMenuId}`);

    // 如果有提供圖片 URL，上傳圖片
    if (imageUrl) {
      await uploadRichMenuImage(richMenuId, imageUrl);
      console.log(`Rich Menu image uploaded: ${richMenuId}`);
    }

    // 設定為預設 Rich Menu
    await setDefaultRichMenu(richMenuId);
    console.log(`Rich Menu set as default: ${richMenuId}`);

    return NextResponse.json({
      success: true,
      richMenuId,
      message: "Rich Menu created and set as default",
      note: imageUrl
        ? "Image uploaded successfully"
        : "Please upload image manually via LINE Official Account Manager",
    });
  } catch (error) {
    console.error("Error setting up rich menu:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/line/rich-menu/setup
 * 取得現有的 Rich Menu 列表
 */
export async function GET() {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" },
        { status: 500 }
      );
    }

    const menus = await getRichMenuList();
    return NextResponse.json({
      success: true,
      richmenus: menus.richmenus || [],
    });
  } catch (error) {
    console.error("Error getting rich menu list:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/line/rich-menu/setup
 * 刪除指定的 Rich Menu
 * 
 * Query params:
 * - richMenuId: 要刪除的 Rich Menu ID
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const richMenuId = searchParams.get("richMenuId");

    if (!richMenuId) {
      return NextResponse.json(
        { error: "richMenuId parameter is required" },
        { status: 400 }
      );
    }

    await deleteRichMenu(richMenuId);
    console.log(`Rich Menu deleted: ${richMenuId}`);

    return NextResponse.json({
      success: true,
      message: `Rich Menu ${richMenuId} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting rich menu:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

