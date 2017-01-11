var fs = require('fs'),
    sanitizeHtml = require('sanitize-html'),
    path = require('path'),
    
    library = '\n<script src="../piSignagePro/templates/screen.min.js"></script>\n';

exports.modifyHTML = function(assetsDir,templateName){
	var closingBodyIndex,
        modifiedData,
        sanitize,
        templatePath;

    if (!templateName)
        return;

    templatePath = path.join(assetsDir, templateName);

    fs.readFile(templatePath,'utf8',function(err,data){
        if(err)
           return console.log('error','custom_layout File Read Error',err)
        //remove script tags
        sanitize= sanitizeHtml(data,{
                allowedTags: ['!DOCTYPE','html','head','meta','title','body','h1','h2','h3', 'h4', 'h5', 'h6', 
                    'blockquote', 'p', 'a', 'ul', 'ol','nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 
                    'hr', 'br', 'div','table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre' , 
                    'marquee', 'style', 'iframe','link','script','img'
                ],
                allowedAttributes: false
        });

        // insert css and js files
        //sanitize = '<!DOCTYPE html>'+sanitize;
        sanitize = data;
        closingBodyIndex = sanitize.lastIndexOf('</body>');
        modifiedData = sanitize.slice(0,closingBodyIndex)+library+sanitize.slice(closingBodyIndex);
        
        fs.writeFile(templatePath,modifiedData,function(err){
            // template modification successful
        })
       
    })
}