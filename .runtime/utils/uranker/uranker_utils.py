# Generated import bridge; edit the matching .ipynb in the project tree.
import sys as _sys
from pathlib import Path as _Path
_runtime = _Path(__file__).resolve().parents[2]
_sys.path.insert(0, str(_runtime.parent))
_sys.path.insert(0, str(_runtime))
from notebook_runtime import exec_notebook as _exec_notebook
_exec_notebook(__file__, globals())
