import { AbilityBuilder, PureAbility, createMongoAbility } from "@casl/ability";
import { Role } from "../generated/prisma/client";

type Actions = "manage" | "create" | "read" | "update" | "delete";
type Subjects = "User" | "all";

export type AppAbility = PureAbility<[Actions, Subjects]>;

export function defineAbilityFor(role: Role): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (role === "ADMIN") {
    can("manage", "all");
  } else {
    can("read", "User");
  }

  return build();
}
