# Animal Island UI attribution

The experimental Web theme uses
[animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.6.0 by
[guokaigdg](https://github.com/guokaigdg).

Animal Island UI is licensed under the
[Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/).
The theme and its bundled Nunito and Noto Sans SC font assets may therefore be used only for
non-commercial purposes. The upstream project is provided without warranties under the license
terms.

Terminal and other monospaced surfaces use the self-hosted
[Noto Sans Mono variable font](https://fontsource.org/fonts/noto-sans-mono) distributed by
Fontsource under the [SIL Open Font License 1.1](https://openfontlicense.org/).

Herdr Web imports the official package stylesheet and uses its `Cursor`, `Title`, `Button`, and
`Switch` components on canonical app surfaces. The adaptation maps the existing sidebar, notes,
terminal, settings, menus, dialogs, safe areas, and mobile controls onto upstream tokens while
preserving the app's established viewport, keyboard, and safe-area geometry. It also uses the
upstream modal clip path on larger screens and follows the CodeBlock typography direction for
terminal surfaces. Compact Settings uses a rounded safe content shape so controls remain inside
the visible panel, and terminals use a warm light palette matched to the rest of the application.
The renderer also remaps Codex's fixed dark prompt surface to the theme's light terminal surface so
application-provided TrueColor output remains compatible with the light terminal palette.

Existing Lucide icons remain where the package's ten built-in icons do not provide an equivalent
terminal or workspace action. Their surrounding controls follow Animal Island sizing, color,
radius, and motion rules. These integration and compatibility changes are modifications of the
upstream visual system and are not endorsed by guokaigdg.
