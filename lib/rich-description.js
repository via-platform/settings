const marked = require('marked');
const renderer = new marked.Renderer();

renderer.code = () => '';
renderer.blockquote = () => '';
renderer.heading = () => '';
renderer.html = () => '';
renderer.image = () => '';
renderer.list = () => '';

let markdown = text => marked(text, {renderer: renderer}).replace(/<p>(.*)<\/p>/, "$1").trim();

module.exports = {
    getSettingDescription: keyPath => {
        let schema = via.config.getSchema(keyPath);
        let description = schema.description || '';
        return markdown(description);
    }
};
