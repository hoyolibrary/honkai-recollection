export interface GridFightRolePropertyConfig {
  PropertyType: string;
  PropertyName?: { Hash: bigint };
  PanelPropertyName?: { Hash: bigint };
  IsDisplay?: boolean;
  Order?: number;
  IconPath?: string;
  MiniIconPath?: string;
  ExtraEffectID?: number;
}
