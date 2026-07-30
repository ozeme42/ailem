const fs = require('fs');

let content = fs.readFileSync('app/test-solver.tsx', 'utf8');

// Add import
content = content.replace(
  "import { PdfDocumentSolver } from '../components/education/test-solver/pdf-document-solver';",
  "import { PdfDocumentSolver } from '../components/education/test-solver/pdf-document-solver';\nimport { HtmlDocumentSolver } from '../components/education/test-solver/html-document-solver';"
);

// Remove unused state
content = content.replace(/  \/\/ References for WebView \/ iframe[\s\S]*?const clearCanvas = \(\) => \{\s*postMessageToHtml\(\{ type: 'CLEAR' \}\);\s*\};\n\n/, '');

// Remove optical open mobile
content = content.replace(/  \/\/ Optical form overlay visibility on mobile\n  const \[isOpticalOpenMobile, setIsOpticalOpenMobile\] = useState\(false\);\n/, '');

// Add HTML to dynamic solvers
content = content.replace(
  `                {/* 2. PDF DOCUMENT SOLVER */}`,
  `                {/* HTML DOCUMENT SOLVER */}
                {test.sourceType === 'html' ? (
                  <HtmlDocumentSolver 
                    test={test}
                    studentAnswers={studentAnswers}
                    studentTextAnswers={studentTextAnswers}
                    handleAnswer={handleAnswer}
                    handleTextAnswer={handleTextAnswer}
                    isReviewMode={isReviewMode}
                    isDark={isDark}
                  />
                ) : null}

                {/* 2. PDF DOCUMENT SOLVER */}`
);

// Remove the old HTML layout
content = content.replace(
  /      \{\/\* RENDER DYNAMIC SOLVER BASED ON SOURCE TYPE \*\/\}[\s\S]*?\{\/\* REVIEW\/ANALYZED VIEW BANNER \*\/\}/,
  `      {/* RENDER DYNAMIC SOLVER BASED ON SOURCE TYPE */}
      {/* OTHER SOLVERS IN SCROLLVIEW */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        
        {/* REVIEW/ANALYZED VIEW BANNER */}`
);

// Remove the modal
content = content.replace(
  /      \{\/\* OPTICAL FORM MODAL FOR MOBILE \(HTML SOURCE\) \*\/\}[\s\S]*?<\/Modal>\n/,
  ''
);

// Remove getHtmlDocument
content = content.replace(
  /function getHtmlDocument\([\s\S]*?\}\n/,
  ''
);

// Modify Footer condition
content = content.replace(
  "&& test.sourceType !== 'mistake' && test.sourceType !== 'html' &&",
  "&& test.sourceType !== 'mistake' &&"
);


fs.writeFileSync('app/test-solver.tsx', content);
console.log('Fixed');
