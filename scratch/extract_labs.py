import os
import json
import re

source_dir = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-main"
target_dir = "/home/axel/Bureau/sante/SAA CO3/aws-saa-academy/src/data"

os.makedirs(target_dir, exist_ok=True)

def extract_labs():
    print("Extracting labs...")
    labs = []
    
    # List all markdown files in source_dir
    files = sorted([f for f in os.listdir(source_dir) if f.endswith('.md')])
    
    for filename in files:
        if filename.lower() == 'readme.md':
            continue
            
        filepath = os.path.join(source_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Get chapter details
        title_match = re.search(r'^#\s+(.*)$', content, re.MULTILINE)
        chapter_title = title_match.group(1).strip() if title_match else os.path.splitext(filename)[0]
        chapter_title = re.sub(r'^(Chapter \d+|Appendix [A-D])\s*:\s*', '', chapter_title)
        
        if filename.startswith('Appendix'):
            match = re.match(r'^Appendix\s+([A-D])', filename)
            chapter_id = f"app_{match.group(1).lower()}" if match else filename
        else:
            match = re.match(r'^(\d+)', filename)
            chapter_id = f"ch_{match.group(1)}" if match else filename
            
        # Parse content line by line to extract labs
        lines = content.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i]
            # Match: "### Lab X: Title" or "### Lab: Title" or "## Hands-On Lab Exercise"
            is_lab_header = False
            lab_title = ""
            
            if line.strip().startswith('### Lab') or line.strip().startswith('### Hands-On Lab') or line.strip().startswith('## Hands-On Lab Exercise'):
                is_lab_header = True
                header_text = line.strip().lstrip('#').strip()
                lab_title = header_text
            
            if is_lab_header:
                lab_lines = []
                # Add the title line
                lab_lines.append(line)
                i += 1
                
                # Consume lines until we hit a heading of equal or higher weight
                # If we started with ### Lab, we stop at #, ##, or another ###
                # If we started with ## Hands-On, we stop at # or ##
                stop_at_headings = ['# ', '## ']
                if line.strip().startswith('###'):
                    stop_at_headings.append('### ')
                    
                while i < len(lines):
                    next_line = lines[i]
                    # Check if next_line is a stop heading
                    is_stop = False
                    for h in stop_at_headings:
                        if next_line.strip().startswith(h):
                            is_stop = True
                            break
                    
                    if is_stop:
                        # Don't increment i, so we can parse this next heading in the outer loop
                        break
                    
                    lab_lines.append(next_line)
                    i += 1
                
                lab_content = "\n".join(lab_lines)
                
                # Create lab ID
                lab_num = len([l for l in labs if l['chapterId'] == chapter_id]) + 1
                lab_id = f"lab_{chapter_id}_{lab_num}"
                
                # Determine domain
                domain = "General & Frameworks"
                if chapter_id.startswith('ch_'):
                    ch_num = int(chapter_id.split('_')[1])
                    if ch_num in [2, 16, 23, 24, 25]:
                        domain = "Domain 1: Design Secure Architectures"
                    elif ch_num in [1, 3, 4, 5, 8, 9, 15, 17, 32]:
                        domain = "Domain 2: Design Resilient Architectures"
                    elif ch_num in [6, 7, 10, 11, 12, 13, 14, 18, 19, 20, 21, 22]:
                        domain = "Domain 3: Design High-Performing Architectures"
                    elif ch_num in [29, 30]:
                        domain = "Domain 4: Design Cost-Optimized Architectures"
                
                labs.append({
                    "id": lab_id,
                    "title": lab_title,
                    "chapterId": chapter_id,
                    "chapterTitle": chapter_title,
                    "domain": domain,
                    "content": lab_content
                })
            else:
                i += 1
                
    # Save to JSON
    labs_json_path = os.path.join(target_dir, 'labsData.json')
    with open(labs_json_path, 'w', encoding='utf-8') as f:
        json.dump(labs, f, ensure_ascii=False, indent=2)
        
    print(f"Extracted {len(labs)} hands-on labs and exercises and saved to {labs_json_path}.")

if __name__ == "__main__":
    extract_labs()
