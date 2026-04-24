import { ImageResponse } from "next/og";
import {
  buildDashboardShareCardSvg,
  parseDashboardShareCardData,
} from "../../../dashboard/share-card-content";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = parseDashboardShareCardData(searchParams);
  const svg = buildDashboardShareCardSvg(data);

  return new ImageResponse(
    (
      <img
        alt="Carte partageable CVforge"
        height="627"
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
        width="1200"
      />
    ),
    {
      height: 627,
      width: 1200,
    },
  );
}
