//テンプレートをここに追加するだけでドロップダウンと検出候補に自動反映される
export const FOLDER_TEMPLATES = {
  nextjs: [
    "src/app/.gitkeep",
    "src/components/.gitkeep",
    "src/lib/.gitkeep",
    "src/types/.gitkeep",
    "public/.gitkeep",
  ],
  react: [
    "src/components/.gitkeep",
    "src/pages/.gitkeep",
    "src/hooks/.gitkeep",
    "src/utils/.gitkeep",
    "public/.gitkeep",
  ],
  python: ["src/.gitkeep", "tests/.gitkeep", "docs/.gitkeep"],
  unknown: [],
} as const;

//FOLDER_TEMPLATESのキーからTechStack型を自動生成する(型宣言)
//TechStack型を宣言することで、FOLDER_TEMPLATESに含まれていないキーが来たときにエラーが出せる。
export type TechStack = keyof typeof FOLDER_TEMPLATES;

//ドロップダウンの選択肢もFOLDER_TEMPLATESのキーから自動生成する
//Object.keysは標準でstring[]型を返すため、asを使ってTechStack[]に上書きしている。
export const TECH_STACK_OPTIONS = Object.keys(FOLDER_TEMPLATES) as TechStack[];
