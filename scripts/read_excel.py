"""Read cached Excel values; stdout stays local. Never commit this output."""
import sys,json,zipfile,pathlib
import openpyxl

def read(path):
    path=pathlib.Path(path)
    if path.suffix.lower()!='.xlsx' or path.stat().st_size>5_000_000:
        raise ValueError('Only .xlsx files up to 5MB are supported')
    with zipfile.ZipFile(path) as z:
        if sum(i.file_size for i in z.infolist())>50_000_000:
            raise ValueError('Expanded workbook exceeds 50MB')
    wb=openpyxl.load_workbook(path,data_only=True,read_only=True)
    result={}
    for s in wb:
        if s.max_row>2000 or s.max_column>100:
            raise ValueError('Workbook dimensions exceed supported template')
        result[s.title]=[list(r) for r in s.values]
    return result
if __name__=='__main__':
    try: json.dump(read(sys.argv[1]),sys.stdout,ensure_ascii=False,allow_nan=False)
    except Exception as e:
        print(str(e),file=sys.stderr);sys.exit(1)
