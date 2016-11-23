var fs = require('fs'),
    sanitizeHtml = require('sanitize-html'),
    path = require('path'),
    
    library = '\n\t<script src="../piSignagePro/templates/screen.min.js"></script>';

exports.modifyHTML = function(assetsDir,templateName){
	var titleIndex,
        modifiedData,
        scriptTag,
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
        titleIndex = sanitize.indexOf('</title>');
        modifiedData = sanitize.substr(0,titleIndex+8)+library+sanitize.substr(titleIndex+8);
        
        fs.writeFile(templatePath,modifiedData,function(err){
            // template modification successful
        })
       
    })
}