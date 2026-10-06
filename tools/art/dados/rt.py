"""Duelo de dados - trazador de rayos minimo (ortografico) para dibujar CUBOS y CUBILETES en la rejilla nativa.
Cada pixel lanza UN rayo por su centro (nada de suavizado): el resultado se cuantiza a rampas de 3-4 tonos con tramado de 1 px y
contorno indigo de 1 px por fuera, igual que el arte a mano de los iconos de la Barra. Mundo: x derecha, y arriba, z hacia la camara."""
import sys
from pathlib import Path
import numpy as np
MYDIR = Path(__file__).resolve().parent                 # (pix.py define su propio HERE: el nuestro se llama MYDIR para no pisar la carpeta del trile)
sys.path.insert(0, str(MYDIR.parent / "trile"))
from pix import *          # Canvas, paleta, save, zoom_sheet, outline_pp

ELEV = np.radians(40.0)                                   # la camara mira la mesa desde 40 grados
NC = np.array([0.0, np.sin(ELEV), np.cos(ELEV)])          # hacia la camara
EX = np.array([1.0, 0.0, 0.0]); EU = np.array([0.0, np.cos(ELEV), -np.sin(ELEV)])   # derecha / arriba de la pantalla

def unit(v): v = np.asarray(v, float); return v / np.linalg.norm(v)
def Rx(d): a = np.radians(d); c, s = np.cos(a), np.sin(a); return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
def Ry(d): a = np.radians(d); c, s = np.cos(a), np.sin(a); return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
def Rz(d): a = np.radians(d); c, s = np.cos(a), np.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
def Raxis(ax, d):
    ax = unit(ax); a = np.radians(d); c, s = np.cos(a), np.sin(a); x, y, z = ax
    return np.array([[c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
                     [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
                     [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)]])

def ordered(W, H):
    """tramado de 1 px (tablero de ajedrez), +-1"""
    j, i = np.mgrid[0:H, 0:W]; return ((i + j) % 2) * 2.0 - 1.0

def finish_rgba(rgb, m, margin=1):
    rgb = np.pad(rgb, ((margin, margin), (margin, margin), (0, 0))); m = np.pad(m, margin)
    return outline_pp(rgb, m)
