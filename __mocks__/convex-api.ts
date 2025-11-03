export const api = {
  posts: {
    createPost: "posts:createPost",
    updatePost: "posts:updatePost",
    getPost: "posts:getPost",
  },
  connections: {
    getConnectionStatus: "connections:getConnectionStatus",
    saveConnection: "connections:saveConnection",
  },
  templates: {
    getTemplates: "templates:getTemplates",
    createTemplate: "templates:createTemplate",
    updateTemplate: "templates:updateTemplate",
    deleteTemplate: "templates:deleteTemplate",
    incrementTemplateUsage: "templates:incrementTemplateUsage",
  },
  userPreferences: {
    getUserPreferences: "userPreferences:getUserPreferences",
  },
  recommendations: {
    getRecommendedTimes: "recommendations:getRecommendedTimes",
  },
};
