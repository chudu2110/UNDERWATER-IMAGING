"""Import trusted project notebooks for the web compatibility layer."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def exec_notebook(module_file, namespace):
    relative = Path(module_file).resolve().relative_to(ROOT / '.runtime')
    path = ROOT / relative.with_suffix('.ipynb')
    notebook = json.loads(path.read_text(encoding='utf-8'))
    source = ''.join(''.join(c['source']) for c in notebook['cells']
                     if 'notebook-only' not in c.get('metadata', {}).get('tags', [])
                     and (c['cell_type'] == 'code' or c.get('metadata', {}).get('script_entrypoint')))
    namespace['__file__'] = str(ROOT / relative)
    exec(compile(source, str(path), 'exec'), namespace)
