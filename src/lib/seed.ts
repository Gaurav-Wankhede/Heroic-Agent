import Testimonial from '@/models/Testimonial';

const sampleTestimonials = [
  {
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    role: "Data Scientist",
    content: "This AI assistant has revolutionized my workflow. The code suggestions and data analysis insights are incredibly accurate and time-saving.",
    rating: 5,
    socialProfiles: {
      linkedin: "https://linkedin.com/in/sarahchen",
      github: "https://github.com/sarahchen",
      x: "https://x.com/sarahchen"
    },
    status: 'approved',
    timestamp: new Date('2024-03-15')
  },
  {
    name: "Michael Rodriguez",
    email: "m.rodriguez@example.com",
    role: "ML Engineer",
    content: "The deep learning capabilities and model optimization suggestions have helped me improve my models significantly. A must-have tool!",
    rating: 5,
    socialProfiles: {
      linkedin: "https://linkedin.com/in/mrodriguez",
      github: "https://github.com/mrodriguez"
    },
    status: 'approved',
    timestamp: new Date('2024-03-14')
  },
  {
    name: "Emily Thompson",
    email: "emily.t@example.com",
    role: "Data Analyst",
    content: "From SQL queries to Python scripts, this assistant has made my data analysis tasks much more efficient. The real-time suggestions are fantastic.",
    rating: 4,
    socialProfiles: {
      linkedin: "https://linkedin.com/in/ethompson",
      x: "https://x.com/ethompson"
    },
    status: 'approved',
    timestamp: new Date('2024-03-13')
  }
];
