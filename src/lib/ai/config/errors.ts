// Define domain-specific error solutions
export const DOMAIN_ERROR_SOLUTIONS: Record<string, Record<string, string>> = {
  'excel': {
    'formula': 'Check formula syntax and ensure all referenced cells exist',
    'macro': 'Verify macro security settings and VBA references',
    'pivot': 'Ensure source data is properly formatted and contains headers',
    'connection': 'Check data source connectivity and refresh settings',
    'default': 'Review Excel documentation for specific function requirements'
  },
  'sql': {
    'syntax': 'Verify SQL syntax and check for missing semicolons or keywords',
    'join': 'Ensure table relationships are properly defined',
    'index': 'Check index availability and query optimization',
    'permission': 'Verify database access permissions',
    'default': 'Review SQL documentation and database schema'
  },
  'python': {
    'import': 'Verify package installation and Python environment',
    'syntax': 'Check indentation and code syntax',
    'type': 'Ensure variable types match the operation requirements',
    'memory': 'Consider using chunking or optimizing data structures',
    'default': 'Review Python documentation and package requirements'
  },
  'tableau': {
    'connection': 'Verify data source connection settings',
    'calculation': 'Check calculated field syntax and dependencies',
    'parameter': 'Ensure parameter configuration is correct',
    'dashboard': 'Verify dashboard layout and device compatibility',
    'default': 'Review Tableau documentation for specific features'
  },
  'power-bi': {
    'dax': 'Verify DAX formula syntax and context',
    'refresh': 'Check data refresh settings and gateway configuration',
    'model': 'Review data model relationships and cardinality',
    'visual': 'Ensure visual settings and interactions are properly configured',
    'default': 'Consult Power BI documentation for specific features'
  },
  'machine-learning': {
    'data': 'Check data preprocessing and feature engineering steps',
    'model': 'Verify model architecture and hyperparameters',
    'training': 'Review training process and validation metrics',
    'memory': 'Optimize memory usage and batch processing',
    'default': 'Consult ML framework documentation and best practices'
  },
  'deep-learning': {
    'gpu': 'Verify GPU configuration and CUDA installation',
    'model': 'Check neural network architecture and layer configuration',
    'training': 'Review loss function and optimization settings',
    'memory': 'Optimize batch size and model parameters',
    'default': 'Consult deep learning framework documentation'
  },
  'nlp': {
    'tokenization': 'Verify tokenization settings and preprocessing',
    'model': 'Check language model configuration and parameters',
    'memory': 'Optimize text processing and batch size',
    'pipeline': 'Review NLP pipeline components and settings',
    'default': 'Consult NLP library documentation and examples'
  },
  'generative-ai': {
    'prompt': 'Review prompt engineering and formatting',
    'model': 'Check model configuration and parameters',
    'token': 'Verify API key and token limits',
    'generation': 'Optimize generation parameters and settings',
    'default': 'Consult generative AI documentation and guidelines'
  },
  'linkedin-optimization': {
    'profile': 'Review profile settings and visibility',
    'content': 'Check content formatting and engagement settings',
    'network': 'Verify connection and messaging settings',
    'visibility': 'Review privacy and professional settings',
    'default': 'Consult LinkedIn help center and best practices'
  },
  'resume-creation': {
    'format': 'Check resume formatting and layout',
    'content': 'Review content structure and keywords',
    'ats': 'Verify ATS compatibility and optimization',
    'export': 'Check file format and compatibility',
    'default': 'Review resume writing guidelines and ATS best practices'
  },
  'online-credibility': {
    'profile': 'Review online profile settings and visibility',
    'content': 'Check content strategy and engagement',
    'branding': 'Verify personal branding elements',
    'visibility': 'Review search engine optimization settings',
    'default': 'Consult personal branding and online presence guidelines'
  }
};

// Helper function to get domain-specific error solution
export function getDomainErrorSolution(domain: string, error: string): string {
  const solutions = DOMAIN_ERROR_SOLUTIONS[domain] || {};
  let bestMatch = 'default';

  // Find the most relevant error category
  for (const category of Object.keys(solutions)) {
    if (error.toLowerCase().includes(category.toLowerCase())) {
      bestMatch = category;
      break;
    }
  }

  return solutions[bestMatch] || 'Please check domain-specific documentation for troubleshooting steps';
}

// Helper function to get domain-specific examples
export function getDomainExamples(domain: string, error: string): string[] {
  const examples: Record<string, Record<string, string[]>> = {
    'excel': {
      'formula': [
        'Use =IFERROR() to handle potential errors',
        'Check cell references are valid',
        'Verify formula syntax is correct'
      ],
      'macro': [
        'Enable macros in Excel settings',
        'Check VBA references are available',
        'Verify macro security settings'
      ],
      'pivot': [
        'Ensure source data is properly formatted and contains headers',
        'Check pivot table configuration',
        'Verify pivot table data source'
      ],
      'connection': [   
        'Verify data source connectivity and refresh settings',
        'Check data source availability',
        'Verify data source credentials'
      ]
    },
    'python': {
      'import': [
        'pip install missing-package',
        'Check virtual environment activation',
        'Verify Python version compatibility'
      ],
      'syntax': [
        'Fix indentation issues',
        'Add missing colons after if/for/while',
        'Close all parentheses and brackets'
      ],
      'type': [
        'Verify variable types match the operation requirements',
        'Check data type compatibility',
        'Verify variable types match the operation requirements'
      ],
      'memory': [
        'Consider using chunking or optimizing data structures',
        'Check memory usage and model parameters',
        'Verify variable types match the operation requirements'
      ],
      'pipeline': [
        'Review NLP pipeline components and settings',
        'Check tokenization settings and preprocessing',
        'Verify NLP pipeline components and settings'
      ]
    },
    'tableau': {
      'connection': [
        'Verify data source connection settings',
        'Check data source availability',
        'Verify data source credentials'
      ],
      'calculation': [
        'Verify DAX formula syntax and context',
        'Check calculated field dependencies',
        'Verify DAX function availability'
      ],
      'parameter': [
        'Verify parameter configuration is correct',
        'Check parameter settings and values',
        'Verify parameter configuration is correct'
      ],
      'dashboard': [    
        'Verify dashboard layout and device compatibility',
        'Check dashboard configuration',
        'Verify dashboard parameters'
      ]
    },
    'power-bi': {
      'dax': [
        'Verify DAX formula syntax and context',
        'Check data model relationships and cardinality',
        'Verify DAX function availability'
      ],
      'refresh': [
        'Verify data refresh settings and gateway configuration',
        'Check data refresh status and errors',
        'Verify data refresh parameters'
      ],
      'model': [    
        'Review data model relationships and cardinality',
        'Check data model configuration',
        'Verify data model relationships and cardinality'
      ],
      'visual': [
        'Ensure visual settings and interactions are properly configured',  
        'Check visual settings and interactions',
        'Verify visual settings and interactions'
      ]
    },
    'machine-learning': {
      'data': [
        'Check data preprocessing steps',
        'Verify feature engineering is properly implemented',
        'Check data source connectivity'
      ],
      'model': [
        'Verify model architecture and hyperparameters',
        'Check model configuration and parameters',
        'Verify model training parameters'
      ],
      'training': [
        'Review loss function and optimization settings',
        'Check training process and validation metrics',
        'Verify model training parameters'
      ],
      'memory': [
        'Optimize memory usage and batch processing',
        'Check memory usage and model parameters',
        'Verify model training parameters'
      ]
    },
    'deep-learning': {
      'gpu': [
        'Verify GPU configuration and CUDA installation',
        'Check neural network architecture and layer configuration',
        'Verify model training parameters'
      ],
      'model': [
        'Verify model architecture and layer configuration',
        'Check neural network architecture and layer configuration',
        'Verify model training parameters'
      ],
      'training': [
        'Review loss function and optimization settings',
        'Check training process and validation metrics',
        'Verify model training parameters'
      ],
      'memory': [
        'Optimize batch size and model parameters',
        'Check memory usage and model parameters',
        'Verify model training parameters'
      ]
    },
    'nlp': {
      'tokenization': [
        'Verify tokenization settings and preprocessing',
        'Check text cleaning and normalization',
        'Verify tokenization parameters'
    ],
      'model': [
        'Verify model configuration and parameters',
        'Check language model configuration and parameters',
        'Verify tokenization parameters'
      ],
      'memory': [
        'Optimize text processing and batch size',
        'Check memory usage and model parameters',
        'Verify tokenization parameters'
      ],
      'pipeline': [
        'Review NLP pipeline components and settings',
        'Check tokenization settings and preprocessing',
        'Verify NLP pipeline components and settings'
      ]
    },
    'generative-ai': {
      'prompt': [
        'Review prompt engineering and formatting',
        'Check model configuration and parameters',
        'Verify API key and token limits'
      ],
      'model': [
        'Verify model configuration and parameters',
        'Check language model configuration and parameters',
        'Verify tokenization parameters'
      ],
      'token': [
        'Verify API key and token limits',
        'Check API key and token limits',
        'Verify tokenization parameters'
      ],
      'generation': [
        'Optimize generation parameters and settings',
        'Check generation parameters and settings',
        'Verify generation parameters and settings'
      ]
    },
    'linkedin-optimization': {
      'profile': [
        'Review profile settings and visibility',
        'Check content formatting and engagement settings',
        'Verify connection and messaging settings'
      ],
      'content': [
        'Review content formatting and engagement',
        'Check content structure and keywords',
        'Verify personal branding elements'
      ],
      'network': [
        'Verify connection and messaging settings',
        'Check professional visibility settings',
        'Verify connection and messaging settings'
      ],
      'visibility': [
        'Review privacy and professional settings',
        'Check search engine optimization settings',
        'Verify personal branding elements' 
      ]
    },
    'resume-creation': {
      'format': [
        'Check resume formatting and layout',
        'Verify ATS compatibility and optimization',
        'Check file format and compatibility'
      ]
    },
    'online-credibility': {
      'profile': [
        'Review online profile settings and visibility',
        'Check content strategy and engagement',
        'Verify personal branding elements'
      ]
    }
  };

  const domainExamples = examples[domain] || {};
  let bestMatch = 'default';

  for (const category of Object.keys(domainExamples)) {
    if (error.toLowerCase().includes(category.toLowerCase())) {
      bestMatch = category;
      break;
    }
  }

  return domainExamples[bestMatch] || [];
} 