import csv
import io
import chardet
from typing import Tuple, List, Dict, Any


def detect_encoding(raw: bytes) -> str:
    result = chardet.detect(raw[:10000])
    enc = result.get("encoding") or "utf-8"
    return enc


def detect_delimiter(text_sample: str) -> str:
    try:
        dialect = csv.Sniffer().sniff(text_sample, delimiters=",;	|")
        return dialect.delimiter
    except Exception:
        return ","


def parse_csv(raw: bytes) -> Tuple[List[Dict[str, Any]], str, str, List[str]]:
    """Returns (rows, encoding, delimiter, headers)."""
    encoding = detect_encoding(raw)
    text = raw.decode(encoding, errors="replace")
    sample = text[:4096]
    delimiter = detect_delimiter(sample)

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = reader.fieldnames or []
    rows = [dict(r) for r in reader]
    return rows, encoding, delimiter, headers


def infer_schema(rows: List[Dict[str, Any]], headers: List[str]) -> Dict[str, Any]:
    """Infer simple types per column."""
    schema: Dict[str, Any] = {}
    for h in headers:
        types_seen = set()
        sample_vals = []
        for row in rows[:200]:
            raw_val = row.get(h)
            if raw_val is None:
                continue
            val = str(raw_val).strip()
            if val == "":
                continue
            sample_vals.append(val)
            try:
                int(val)
                types_seen.add("integer")
                continue
            except Exception:
                pass
            try:
                float(val)
                types_seen.add("float")
                continue
            except Exception:
                pass
            if "@" in val and "." in val:
                types_seen.add("email")
            else:
                types_seen.add("string")
        if "string" in types_seen or "email" in types_seen:
            inferred = "email" if "email" in types_seen and "string" not in types_seen else "string"
        elif "float" in types_seen:
            inferred = "float"
        elif "integer" in types_seen:
            inferred = "integer"
        else:
            inferred = "string"
        schema[h] = {"type": inferred, "samples": sample_vals[:3]}
    return schema
