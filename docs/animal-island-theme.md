# Animal Island UI attribution

The experimental Web theme uses
[animal-island-ui](https://github.com/guokaigdg/animal-island-ui) version 1.6.0 by
[guokaigdg](https://github.com/guokaigdg).

Animal Island UI is licensed under the
[Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/).
The theme and its bundled Nunito and Noto Sans SC font assets may therefore be used only for
non-commercial purposes. The upstream project is provided without warranties under the license
terms.

Herdr Web imports the official package stylesheet and uses its `Cursor`, `Title`, `Button`, and
`Switch` components on canonical app surfaces. The adaptation maps the existing sidebar, notes,
terminal, settings, menus, dialogs, safe areas, and mobile controls onto upstream tokens while
preserving the app's established viewport, keyboard, and safe-area geometry. It also uses the
upstream modal clip path and follows the CodeBlock typography and palette direction for terminal
surfaces.

Existing Lucide icons remain where the package's ten built-in icons do not provide an equivalent
terminal or workspace action. Their surrounding controls follow Animal Island sizing, color,
radius, and motion rules. These integration and compatibility changes are modifications of the
upstream visual system and are not endorsed by guokaigdg.
