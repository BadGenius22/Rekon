# ============================================================

# 0. INSTALL SHADCN/UI + REQUIRED DEPENDENCIES (pnpm)

# ============================================================

cursor.exec("pnpm dlx shadcn-ui init")
cursor.exec("pnpm add lucide-react class-variance-authority tailwind-merge")

# ============================================================

# 1. LOAD YOUR DESIGN TOKENS FROM design.json

# ============================================================

cursor.apply_patch("design.json", "read_only")

cursor.exec("echo \"// Auto-generated from design.json\" > lib/tokens.js")

cursor.edit_file("lib/tokens.js", "replace_file_from_file:design.json", """
export const tokens = JSON.parse(`{{file_contents}}`);
""")

# ============================================================

# 2. UPDATE tailwind.config.js USING design.json

# ============================================================

cursor.edit_file("tailwind.config.js", "replace_file", """
const { fontFamily } = require("tailwindcss/defaultTheme");
const { tokens } = require("./lib/tokens");

module.exports = {
darkMode: ["class"],
content: [
"./app/**/*.{ts,tsx}",
"./components/**/*.{ts,tsx}",
"./ui/**/*.{ts,tsx}"
],
theme: {
container: {
center: true,
padding: "2rem",
},
extend: {
colors: tokens.colors || {},
fontFamily: {
sans: ["Inter", ...fontFamily.sans],
display: ["Geist", ...fontFamily.sans],
},
borderRadius: tokens.radii || {},
spacing: tokens.spacing || {},
},
},
plugins: [require("tailwindcss-animate")],
};
""")

# ============================================================

# 3. INSTALL SHADCN COMPONENTS (USE YOUR UI GUIDELINES)

# ============================================================

cursor.apply_patch("ui-guidelines.md", "read_only")

cursor.exec("pnpm dlx shadcn-ui add button input card form textarea dropdown-menu select badge toast avatar sheet switch dialog table skeleton tabs separator label alert scroll-area")

# ============================================================

# 4. FOLDER STRUCTURE (SAFE CREATE)

# ============================================================

cursor.mkdir("lib")
cursor.mkdir("ui")
cursor.mkdir("components/layout")
cursor.mkdir("components/shared")

cursor.write_file("lib/utils.ts", """
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
return twMerge(clsx(inputs));
}
""")

# ============================================================

# 5. NEW APP SHELL (MATCH UI GUIDELINES)

# ============================================================

cursor.write_file("components/layout/app-shell.tsx", """
import React from "react";
import { cn } from "@/lib/utils";
import { NavigationMenu } from "@/ui/navigation-menu";

export function AppShell({ children }) {
return (

<div className="min-h-screen bg-background text-foreground">
<header className="border-b border-border bg-card/40 backdrop-blur-md">
<NavigationMenu />
</header>
<main className="container py-10">{children}</main>
</div>
);
}
""")

cursor.edit_file("app/layout.tsx", "replace_file", """
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

export const metadata = {
title: "My App",
};

export default function RootLayout({ children }) {
return (

<html lang="en" suppressHydrationWarning>
<body>
<AppShell>{children}</AppShell>
</body>
</html>
);
}
""")

# ============================================================

# 6. MIGRATION RULES — AUTO APPLY (SHADCN)

# ============================================================

cursor.apply_rule("""

- Replace all <button> with <Button /> from '@/ui/button' unless already imported.
- Replace <input> with <Input />.
- Wrap card-looking divs in <Card /> components.
- Replace gray backgrounds with design.json surface tokens.
- Replace old border classes with `border-border`.
- Replace old primary with tokens.colors.brand.500 if exists.
- Apply paddings & spacings using design.json spacing tokens.
- Apply radii tokens for rounded corners.
  """)

cursor.edit_tree("components", "apply_rules")
cursor.edit_tree("app", "apply_rules")

# ============================================================

# 7. CREATE EXAMPLE PAGE

# ============================================================

cursor.write_file("app/example/page.tsx", """
import { Button } from "@/ui/button";
import { Card, CardHeader, CardContent } from "@/ui/card";

export default function ExamplePage() {
return (
<Card>
<CardHeader>

<h1 className="font-display text-3xl">Shadcn + Design Tokens Working</h1>
</CardHeader>
<CardContent className="space-y-4">
<Button>Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
</CardContent>
</Card>
);
}
""")

# ============================================================

# 8. CLEANUP

# ============================================================

cursor.delete("components/old", "if_exists")
cursor.delete("styles/old.css", "if_exists")

cursor.search_and_replace("class=\"btn", "class=\"")
cursor.search_and_replace("className=\"btn", "className=\"")

# ============================================================

# 9. LINT + FORMAT

# ============================================================

cursor.exec("pnpm lint --fix || true")
cursor.exec("pnpm format || true")
