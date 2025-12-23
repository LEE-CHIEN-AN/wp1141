export type ShadowSegment = {
  polyline: [number, number][];
  is_shaded: boolean;
  shade_fraction: number;
};

export type RouteResponse = {
  polyline: [number, number][];
  shadow_ratio: number;
  shadow_segments: ShadowSegment[];
  metadata: {
    total_length_m: number;
    buildings: number;
    route_nodes: number;
  };
};

